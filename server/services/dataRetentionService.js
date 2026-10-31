const { UpdateTimeToLiveCommand, DescribeTimeToLiveCommand } = require('@aws-sdk/client-dynamodb');
const { rawClient, getFullTableName } = require('../config/dynamoClient');

// The 5 ephemeral transactional tables that have a strict 90-day retention policy
const EPHEMERAL_ENTITIES = [
  'bookings',
  'busdispatches',
  'notifications',
  'auditlogs',
  'inquiries',
];

// Tables that are PERMANENT and MUST NEVER BE PURGED
const PROTECTED_MASTER_ENTITIES = [
  'settings',      // Website CMS, WhatsApp configs, company profile, print footer
  'tenants',       // Courier organizations & SaaS accounts
  'users',         // Staff, crew, admin, superadmin credentials
  'buses',         // Bus fleet directory
  'drivers',       // Drivers and crew directory
  'cities',        // From & To cities, counter pickup/delivery branches
  'destinations',  // Destination route corridors
  'parceltypes',   // Freight & parcel category rates
  'customers',     // Commercial vendor & customer directory
];

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Returns model instance for an entity name safely
 */
const getModelForEntity = (entityName) => {
  const map = {
    bookings: '../models/Booking',
    busdispatches: '../models/BusDispatch',
    notifications: '../models/Notification',
    auditlogs: '../models/AuditLog',
    inquiries: '../models/Inquiry',
  };
  const target = map[entityName.toLowerCase()];
  if (!target) return null;
  try {
    return require(target);
  } catch (err) {
    console.error(`[Data Retention] Failed to load model for ${entityName}:`, err.message);
    return null;
  }
};

/**
 * Enable AWS DynamoDB native TTL on ephemeral tables
 */
const enableDynamoDbTTL = async () => {
  for (const entity of EPHEMERAL_ENTITIES) {
    const tableName = getFullTableName(entity);
    try {
      // Check current TTL status
      const desc = await rawClient.send(
        new DescribeTimeToLiveCommand({ TableName: tableName })
      );
      const ttlStatus = desc?.TimeToLiveDescription?.TimeToLiveStatus;

      if (ttlStatus === 'ENABLED' || ttlStatus === 'ENABLING') {
        continue;
      }

      console.log(`[DynamoDB TTL] Enabling TTL on table "${tableName}" for attribute "ttl"...`);
      await rawClient.send(
        new UpdateTimeToLiveCommand({
          TableName: tableName,
          TimeToLiveSpecification: {
            Enabled: true,
            AttributeName: 'ttl',
          },
        })
      );
      console.log(`[DynamoDB TTL] ✅ TTL enabled successfully on "${tableName}".`);
    } catch (err) {
      // Non-fatal warning if table not created yet or already updating
      if (err.name !== 'ResourceNotFoundException' && err.name !== 'ValidationException') {
        console.warn(`[DynamoDB TTL Notice] Table "${tableName}": ${err.message}`);
      }
    }
  }
};

/**
 * Runs a complete data retention sweep:
 * Finds and removes all records older than 90 days from the 5 ephemeral tables.
 * Master configuration tables are strictly preserved.
 */
const runDataRetentionSweep = async () => {
  const startTime = Date.now();
  const cutoffDate = new Date(Date.now() - RETENTION_MS);
  const cutoffTime = cutoffDate.getTime();

  console.log(`[Data Retention Purge] 🧹 Starting 90-day sweep (Purging records created before ${cutoffDate.toISOString()})...`);

  const results = {
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: RETENTION_DAYS,
    purged: {},
    totalPurged: 0,
    durationMs: 0,
  };

  for (const entity of EPHEMERAL_ENTITIES) {
    const model = getModelForEntity(entity);
    if (!model) continue;

    try {
      // Raw scan without query filters to find expired items
      const items = await model._rawScan();
      let purgedCount = 0;

      for (const item of items) {
        // Resolve creation timestamp across entity schemas
        const rawDate =
          item.createdAt ||
          item.dispatchedAt ||
          item.timestamp ||
          item.sentAt;

        if (!rawDate) continue;

        const itemTime = new Date(rawDate).getTime();
        if (!isNaN(itemTime) && itemTime < cutoffTime) {
          const id = item.id || item._id;
          if (id) {
            await model.findByIdAndDelete(id);
            purgedCount++;
          }
        }
      }

      results.purged[entity] = purgedCount;
      results.totalPurged += purgedCount;
      if (purgedCount > 0) {
        console.log(`[Data Retention Purge] 🗑️  Purged ${purgedCount} expired record(s) from "${entity}".`);
      }
    } catch (err) {
      console.error(`[Data Retention Purge] Error sweeping "${entity}":`, err.message);
      results.purged[entity] = { error: err.message };
    }
  }

  results.durationMs = Date.now() - startTime;
  console.log(
    `[Data Retention Purge] ✅ Completed sweep in ${results.durationMs}ms. Total records wiped out: ${results.totalPurged}. Protected tables (${PROTECTED_MASTER_ENTITIES.join(', ')}) remain intact.`
  );

  return results;
};

/**
 * Initializes retention service:
 * 1. Enables DynamoDB TTL
 * 2. Runs startup purge sweep
 * 3. Schedules recurring 24-hour purge interval
 */
let workerIntervalId = null;

const initRetentionWorker = () => {
  // 1. Enable TTL on AWS tables in background
  enableDynamoDbTTL().catch((err) => {
    console.warn('[Data Retention] TTL configuration notice:', err.message);
  });

  // 2. Run initial sweep 15 seconds after server start to allow initialization to finish
  setTimeout(() => {
    runDataRetentionSweep().catch((err) => {
      console.error('[Data Retention] Initial startup sweep failed:', err.message);
    });
  }, 15000);

  // 3. Recurring 24-hour interval
  if (workerIntervalId) clearInterval(workerIntervalId);
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  workerIntervalId = setInterval(() => {
    runDataRetentionSweep().catch((err) => {
      console.error('[Data Retention] Scheduled 24h sweep failed:', err.message);
    });
  }, TWENTY_FOUR_HOURS);

  console.log('[Data Retention Worker] 🛡️  90-day retention worker registered (runs every 24 hours).');
};

module.exports = {
  EPHEMERAL_ENTITIES,
  PROTECTED_MASTER_ENTITIES,
  RETENTION_DAYS,
  RETENTION_MS,
  enableDynamoDbTTL,
  runDataRetentionSweep,
  initRetentionWorker,
};
