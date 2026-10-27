const {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { docClient, getFullTableName } = require('../../config/dynamoClient');

// In-memory model registry to support cross-entity .populate('tenantId') etc.
const modelRegistry = {};

/**
 * Evaluates whether an in-memory document satisfies a MongoDB query filter
 */
function matchesFilter(item, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const key of Object.keys(filter)) {
    const filterVal = filter[key];

    // Handle logical operators
    if (key === '$or') {
      if (!Array.isArray(filterVal) || filterVal.length === 0) return true;
      const matchedAny = filterVal.some((subFilter) => matchesFilter(item, subFilter));
      if (!matchedAny) return false;
      continue;
    }

    if (key === '$and') {
      if (!Array.isArray(filterVal)) return true;
      const matchedAll = filterVal.every((subFilter) => matchesFilter(item, subFilter));
      if (!matchedAll) return false;
      continue;
    }

    // Resolve target value from item (handles id / _id equivalence and nested keys)
    let itemVal;
    if (key === '_id' || key === 'id') {
      itemVal = item._id !== undefined ? item._id : item.id;
    } else if (key.includes('.')) {
      const parts = key.split('.');
      itemVal = item;
      for (const p of parts) {
        if (itemVal == null) break;
        itemVal = itemVal[p];
      }
    } else {
      itemVal = item[key];
    }

    // Direct comparison
    if (filterVal === null || filterVal === undefined) {
      if (itemVal !== filterVal) return false;
      continue;
    }

    // RegExp check
    if (filterVal instanceof RegExp) {
      if (!filterVal.test(String(itemVal != null ? itemVal : ''))) return false;
      continue;
    }

    // Operator comparison objects
    if (typeof filterVal === 'object' && !(filterVal instanceof RegExp) && !(filterVal instanceof Date)) {
      for (const op of Object.keys(filterVal)) {
        const opVal = filterVal[op];
        if (op === '$regex') {
          const isCaseInsensitive = filterVal.$options?.includes('i');
          const regex = typeof opVal === 'string' ? new RegExp(opVal, isCaseInsensitive ? 'i' : '') : opVal;
          if (!regex.test(String(itemVal || ''))) return false;
        } else if (op === '$in') {
          if (!Array.isArray(opVal)) return false;
          const strList = opVal.map((v) => (v != null && v._id ? String(v._id) : String(v)));
          const targetStr = itemVal != null && itemVal._id ? String(itemVal._id) : String(itemVal);
          if (!strList.includes(targetStr)) return false;
        } else if (op === '$nin') {
          if (!Array.isArray(opVal)) return true;
          const strList = opVal.map((v) => (v != null && v._id ? String(v._id) : String(v)));
          const targetStr = itemVal != null && itemVal._id ? String(itemVal._id) : String(itemVal);
          if (strList.includes(targetStr)) return false;
        } else if (op === '$ne') {
          const strTarget = String(itemVal || '');
          const strOp = String(opVal || '');
          if (strTarget === strOp) return false;
        } else if (op === '$gt') {
          if (!(new Date(itemVal) > new Date(opVal)) && !(itemVal > opVal)) return false;
        } else if (op === '$gte') {
          if (!(new Date(itemVal) >= new Date(opVal)) && !(itemVal >= opVal)) return false;
        } else if (op === '$lt') {
          if (!(new Date(itemVal) < new Date(opVal)) && !(itemVal < opVal)) return false;
        } else if (op === '$lte') {
          if (!(new Date(itemVal) <= new Date(opVal)) && !(itemVal <= opVal)) return false;
        } else if (op === '$exists') {
          const exists = itemVal !== undefined;
          if (exists !== Boolean(opVal)) return false;
        }
      }
      continue;
    }

    // ID / Foreign Key normalization
    const cleanFilterVal = filterVal?._id ? String(filterVal._id) : String(filterVal);
    const cleanItemVal = itemVal?._id ? String(itemVal._id) : String(itemVal);

    if (key === '_id' || key === 'id' || key.toLowerCase().endsWith('id')) {
      if (cleanItemVal.toLowerCase() !== cleanFilterVal.toLowerCase()) {
        return false;
      }
      continue;
    }

    // Case-insensitive string check if both strings
    if (typeof itemVal === 'string' && typeof filterVal === 'string') {
      if (itemVal.toLowerCase() !== filterVal.toLowerCase()) return false;
      continue;
    }

    if (itemVal !== filterVal) {
      return false;
    }
  }

  return true;
}

/**
 * Helper to resolve target Model for a populate path
 */
function getModelForPath(pathName) {
  if (!pathName) return null;
  const lower = pathName.toLowerCase();
  const clean = lower.replace(/id$/, '').replace(/s$/, '');

  let model = null;
  if (clean === 'adminuser' || clean === 'createdby' || clean === 'dispatchedby' || clean === 'updatedby') {
    model = modelRegistry['user'];
  } else if (clean === 'tenant') {
    model = modelRegistry['tenant'];
  } else if (clean === 'customer') {
    model = modelRegistry['customer'];
  } else if (clean === 'booking') {
    model = modelRegistry['booking'];
  } else if (clean === 'bus') {
    model = modelRegistry['bus'];
  } else if (clean === 'driver') {
    model = modelRegistry['driver'];
  } else if (clean === 'city') {
    model = modelRegistry['city'];
  } else if (clean === 'destination') {
    model = modelRegistry['destination'];
  } else if (clean === 'parceltype') {
    model = modelRegistry['parceltype'];
  } else {
    model = modelRegistry[clean] || modelRegistry[lower];
  }

  if (!model) {
    const filenameMap = {
      user: 'User',
      tenant: 'Tenant',
      customer: 'Customer',
      booking: 'Booking',
      bus: 'Bus',
      driver: 'Driver',
      city: 'City',
      destination: 'Destination',
      parceltype: 'ParcelType',
      setting: 'Setting',
      notification: 'Notification',
      inquiry: 'Inquiry',
      auditlog: 'AuditLog',
      busdispatch: 'BusDispatch',
    };
    const targetFile = filenameMap[clean] || filenameMap[lower];
    if (targetFile) {
      try {
        model = require(`../${targetFile}`);
      } catch (e) {}
    }
  }

  return model;
}

/**
 * Helper to populate a single document instance or plain object
 */
async function populateInstance(inst, pop, lean = false) {
  if (!inst) return;
  const pathName = pop.path;
  const select = pop.select;
  if (!pathName) return;

  const parts = pathName.split('.');
  let targetObj = inst;
  for (let i = 0; i < parts.length - 1; i++) {
    targetObj = targetObj[parts[i]];
    if (!targetObj) return;
  }
  const lastKey = parts[parts.length - 1];
  const refVal = targetObj[lastKey];
  if (refVal == null) return;

  const targetModel = getModelForPath(lastKey) || getModelForPath(pathName);
  if (!targetModel) return;

  const applySelect = (doc) => {
    if (!doc) return doc;
    const cleanDoc = doc.toObject ? doc.toObject() : { ...doc };
    if (!select) return cleanDoc;
    const selectParts = typeof select === 'string' ? select.split(/\s+/).filter(Boolean) : [];
    const exclude = selectParts.filter((p) => p.startsWith('-')).map((p) => p.slice(1));
    const include = selectParts.filter((p) => !p.startsWith('-'));
    if (exclude.length > 0) {
      exclude.forEach((f) => delete cleanDoc[f]);
      return cleanDoc;
    }
    if (include.length > 0) {
      const proj = { id: cleanDoc.id, _id: cleanDoc._id };
      include.forEach((f) => {
        proj[f] = cleanDoc[f];
      });
      return proj;
    }
    return cleanDoc;
  };

  if (Array.isArray(refVal)) {
    const populatedList = [];
    for (const item of refVal) {
      const id = typeof item === 'object' && item ? (item._id || item.id) : item;
      if (id) {
        const found = await targetModel.findById(id);
        populatedList.push(applySelect(found) || item);
      } else {
        populatedList.push(item);
      }
    }
    targetObj[lastKey] = populatedList;
  } else {
    const id = typeof refVal === 'object' && refVal ? (refVal._id || refVal.id) : refVal;
    if (id) {
      const found = await targetModel.findById(id);
      if (found) {
        targetObj[lastKey] = applySelect(found);
      }
    }
  }
}

/**
 * Chainable query builder for find / findOne / findById operations supporting
 * .sort(), .limit(), .skip(), .populate(), .select(), .lean()
 */
class QueryChain {
  constructor(model, filter = {}, options = {}) {
    this.model = model;
    this.filter = filter || {};
    this.isSingleDoc = Boolean(options.isSingleDoc);
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._select = null;
    this._populates = [];
    this._lean = false;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(n) {
    this._limit = parseInt(n, 10);
    return this;
  }

  skip(n) {
    this._skip = parseInt(n, 10);
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  populate(field, selectFields) {
    if (typeof field === 'string') {
      this._populates.push({ path: field, select: selectFields });
    } else if (field && typeof field === 'object') {
      this._populates.push(field);
    }
    return this;
  }

  async exec() {
    // If querying single doc by ID and ID is explicitly null or undefined
    if (this.isSingleDoc && ('id' in this.filter || '_id' in this.filter)) {
      const targetId = this.filter.id !== undefined ? this.filter.id : this.filter._id;
      if (targetId === null || targetId === undefined) {
        return null;
      }
    }

    let items;

    // Direct GetCommand optimization if single query by id
    const filterKeys = Object.keys(this.filter);
    if (this.isSingleDoc && filterKeys.length === 1 && (filterKeys[0] === 'id' || filterKeys[0] === '_id')) {
      const cleanId = String(this.filter.id || this.filter._id);
      try {
        const getRes = await docClient.send(
          new GetCommand({
            TableName: this.model.tableName,
            Key: { id: cleanId },
          })
        );
        if (getRes.Item) {
          items = [getRes.Item];
        } else {
          items = await this.model._rawScan();
        }
      } catch (e) {
        items = await this.model._rawScan();
      }
    } else {
      items = await this.model._rawScan();
    }

    items = items.filter((item) => matchesFilter(item, this.filter));

    // Sorting
    if (this._sort) {
      const sortKeys = typeof this._sort === 'string' ? { [this._sort.replace(/^-/, '')]: this._sort.startsWith('-') ? -1 : 1 } : this._sort;
      items.sort((a, b) => {
        for (const [k, dir] of Object.entries(sortKeys)) {
          const valA = a[k];
          const valB = b[k];
          if (valA === valB) continue;
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          return dir > 0 ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        }
        return 0;
      });
    }

    // Skip & Limit
    if (typeof this._skip === 'number' && this._skip > 0) {
      items = items.slice(this._skip);
    }
    if (typeof this._limit === 'number' && this._limit > 0) {
      items = items.slice(0, this._limit);
    }

    if (this.isSingleDoc) {
      if (items.length === 0) return null;
      items = [items[0]];
    }

    // Wrap items in Model instances (or plain objects if lean)
    let instances = items.map((data) => (this._lean ? { ...data } : this.model._createInstance(data)));

    // Handle Populates
    for (const pop of this._populates) {
      for (const inst of instances) {
        await populateInstance(inst, pop, this._lean);
      }
    }

    // Handle Projections / Select
    if (this._select) {
      const selectParts = typeof this._select === 'string' ? this._select.split(/\s+/).filter(Boolean) : [];
      const excludeFields = selectParts.filter((p) => p.startsWith('-')).map((p) => p.slice(1));
      const includeFields = selectParts.filter((p) => !p.startsWith('-'));

      if (excludeFields.length > 0) {
        for (const inst of instances) {
          for (const f of excludeFields) {
            delete inst[f];
          }
        }
      } else if (includeFields.length > 0) {
        instances = instances.map((inst) => {
          const projected = { id: inst.id, _id: inst._id };
          for (const f of includeFields) {
            projected[f] = inst[f];
          }
          return this._lean ? projected : this.model._createInstance(projected);
        });
      }
    }

    return this.isSingleDoc ? (instances[0] || null) : instances;
  }

  // Awaitable promise support
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

/**
 * Universal DynamoModel Class
 */
class DynamoModel {
  constructor(entityName, options = {}) {
    this.entityName = entityName.toLowerCase();
    this.tableName = getFullTableName(entityName);
    this.options = options;

    // Register into model registry
    modelRegistry[this.entityName] = this;
    const singular = this.entityName.endsWith('s') ? this.entityName.slice(0, -1) : this.entityName;
    modelRegistry[singular] = this;
  }

  _createInstance(data = {}) {
    const self = this;
    const cleanData = { ...data };

    // Standardize _id and id
    const cleanId = cleanData.id || cleanData._id || uuidv4();
    cleanData.id = String(cleanId);
    cleanData._id = String(cleanId);

    // Attach instance methods
    Object.defineProperties(cleanData, {
      save: {
        value: async function () {
          // Hash password if modified and entity has password
          if (self.options.hasPassword && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
          }
          this.updatedAt = new Date().toISOString();
          await self._rawPut(this);
          return this;
        },
        writable: true,
        enumerable: false,
      },
      matchPassword: {
        value: async function (enteredPassword) {
          if (!this.password || typeof enteredPassword !== 'string') return false;
          return await bcrypt.compare(enteredPassword, this.password);
        },
        writable: true,
        enumerable: false,
      },
      populate: {
        value: async function (pathName, selectFields) {
          await populateInstance(this, { path: pathName, select: selectFields });
          return this;
        },
        writable: true,
        enumerable: false,
      },
      toObject: {
        value: function () {
          return { ...this };
        },
        writable: true,
        enumerable: false,
      },
      toJSON: {
        value: function () {
          return { ...this };
        },
        writable: true,
        enumerable: false,
      },
    });

    return cleanData;
  }

  async _rawScan() {
    try {
      const res = await docClient.send(new ScanCommand({ TableName: this.tableName }));
      return res.Items || [];
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        console.warn(`[DynamoDB] Table "${this.tableName}" does not exist yet. Returning empty list.`);
        return [];
      }
      throw err;
    }
  }

  async _rawPut(item) {
    const sanitizeValue = (val) => {
      if (val === null || val === undefined) return val;
      if (val instanceof Date) return val.toISOString();
      if (Array.isArray(val)) return val.map(sanitizeValue);
      if (typeof val === 'object' && !(val instanceof RegExp)) {
        const out = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = sanitizeValue(v);
        }
        return out;
      }
      return val;
    };

    const payload = sanitizeValue({ ...item });
    if (!payload.id) payload.id = payload._id || uuidv4();
    if (!payload._id) payload._id = payload.id;
    if (!payload.createdAt) payload.createdAt = new Date().toISOString();
    payload.updatedAt = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: payload,
      })
    );
    return payload;
  }

  // Mongoose: Model.find(filter)
  find(filter = {}) {
    return new QueryChain(this, filter, { isSingleDoc: false });
  }

  // Mongoose: Model.findOne(filter)
  findOne(filter = {}) {
    return new QueryChain(this, filter, { isSingleDoc: true });
  }

  // Mongoose: Model.findById(id)
  findById(id) {
    const cleanId = typeof id === 'object' && id && id._id ? String(id._id) : (id != null ? String(id) : null);
    return new QueryChain(this, { id: cleanId }, { isSingleDoc: true });
  }

  // Mongoose: Model.create(data)
  async create(data) {
    if (Array.isArray(data)) {
      const created = [];
      for (const item of data) {
        created.push(await this.create(item));
      }
      return created;
    }

    const itemInstance = this._createInstance(data);
    await itemInstance.save();
    return itemInstance;
  }

  // Mongoose: Model.findByIdAndUpdate(id, update, options)
  async findByIdAndUpdate(id, update = {}, options = { new: true }) {
    if (!id) return null;
    const existing = await this.findById(id);
    if (!existing) return null;

    // Handle MongoDB update operators ($set, $inc, etc.)
    const setUpdates = update.$set ? { ...update, ...update.$set } : { ...update };
    delete setUpdates.$set;

    // Handle $inc
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (existing[k] || 0) + v;
      }
      delete setUpdates.$inc;
    }

    for (const [k, v] of Object.entries(setUpdates)) {
      existing[k] = v;
    }

    await existing.save();
    return existing;
  }

  async findOneAndUpdate(filter = {}, update = {}, options = { new: true }) {
    const item = await this.findOne(filter);
    if (!item) return null;
    return await this.findByIdAndUpdate(item.id || item._id, update, options);
  }

  // Mongoose: Model.updateOne(filter, update, options)
  async updateOne(filter = {}, update = {}, options = {}) {
    const item = await this.findOne(filter);
    if (!item) return { matchedCount: 0, modifiedCount: 0 };
    await this.findByIdAndUpdate(item.id || item._id, update, options);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  // Mongoose: Model.updateMany(filter, update, options)
  async updateMany(filter = {}, update = {}, options = {}) {
    const items = await this.find(filter);
    let count = 0;
    for (const item of items) {
      await this.findByIdAndUpdate(item.id || item._id, update, options);
      count++;
    }
    return { matchedCount: count, modifiedCount: count };
  }

  // Mongoose: Model.findByIdAndDelete(id)
  async findByIdAndDelete(id) {
    if (!id) return null;
    const cleanId = typeof id === 'object' && id._id ? String(id._id) : String(id);
    const existing = await this.findById(cleanId);
    if (!existing) return null;

    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { id: cleanId },
      })
    );
    return existing;
  }

  async deleteOne(filter = {}) {
    const item = await this.findOne(filter);
    if (!item) return { deletedCount: 0 };
    await this.findByIdAndDelete(item.id || item._id);
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const items = await this.find(filter);
    for (const item of items) {
      await this.findByIdAndDelete(item.id || item._id);
    }
    return { deletedCount: items.length };
  }

  async countDocuments(filter = {}) {
    const items = await this._rawScan();
    return items.filter((item) => matchesFilter(item, filter)).length;
  }

  // Mongoose: Model.aggregate(pipeline)
  async aggregate(pipeline = []) {
    let items = await this._rawScan();

    for (const stage of pipeline) {
      const stageName = Object.keys(stage)[0];
      const stageVal = stage[stageName];

      if (stageName === '$match') {
        items = items.filter((item) => matchesFilter(item, stageVal));
      } else if (stageName === '$group') {
        const groups = {};
        const groupKeyField = stageVal._id;

        for (const item of items) {
          let gKey;
          if (groupKeyField === null) {
            gKey = '__global__';
          } else if (typeof groupKeyField === 'string' && groupKeyField.startsWith('$')) {
            gKey = String(item[groupKeyField.slice(1)] || '');
          } else if (typeof groupKeyField === 'object') {
            // Grouping by object composite key
            gKey = JSON.stringify(groupKeyField);
          } else {
            gKey = String(groupKeyField);
          }

          if (!groups[gKey]) {
            groups[gKey] = {
              _id: groupKeyField === null ? null : gKey,
              __items: [],
            };
          }
          groups[gKey].__items.push(item);
        }

        // Compute group accumulations ($sum, $avg, $push, etc.)
        const resultGroups = [];
        for (const g of Object.values(groups)) {
          const groupResult = { _id: g._id };
          for (const [field, acc] of Object.entries(stageVal)) {
            if (field === '_id') continue;
            const opName = Object.keys(acc)[0];
            const opVal = acc[opName];

            if (opName === '$sum') {
              if (opVal === 1) {
                groupResult[field] = g.__items.length;
              } else if (typeof opVal === 'string' && opVal.startsWith('$')) {
                const targetKey = opVal.slice(1);
                groupResult[field] = g.__items.reduce((accSum, it) => accSum + (Number(it[targetKey]) || 0), 0);
              } else if (typeof opVal === 'object' && opVal.$cond) {
                // Handle conditional sum e.g. { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } }
                const [condObj, trueVal, falseVal] = opVal.$cond;
                let count = 0;
                for (const it of g.__items) {
                  if (condObj.$eq) {
                    const [cField, cVal] = condObj.$eq;
                    const fieldName = cField.startsWith('$') ? cField.slice(1) : cField;
                    if (it[fieldName] === cVal) count += trueVal;
                    else count += falseVal;
                  }
                }
                groupResult[field] = count;
              } else {
                groupResult[field] = Number(opVal) * g.__items.length;
              }
            } else if (opName === '$push') {
              if (typeof opVal === 'string' && opVal.startsWith('$')) {
                groupResult[field] = g.__items.map((it) => it[opVal.slice(1)]);
              } else {
                groupResult[field] = g.__items;
              }
            }
          }
          resultGroups.push(groupResult);
        }
        items = resultGroups;
      } else if (stageName === '$project') {
        items = items.map((it) => {
          const proj = {};
          for (const [k, v] of Object.entries(stageVal)) {
            if (v === 1 || v === true) proj[k] = it[k];
            else if (typeof v === 'string' && v.startsWith('$')) proj[k] = it[v.slice(1)];
          }
          return proj;
        });
      } else if (stageName === '$sort') {
        const sortKeys = stageVal;
        items.sort((a, b) => {
          for (const [k, dir] of Object.entries(sortKeys)) {
            const valA = a[k];
            const valB = b[k];
            if (valA === valB) continue;
            return dir > 0 ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
          }
          return 0;
        });
      } else if (stageName === '$limit') {
        items = items.slice(0, stageVal);
      }
    }

    return items;
  }
}

module.exports = DynamoModel;
