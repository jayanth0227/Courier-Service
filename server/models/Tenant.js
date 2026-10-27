const DynamoModel = require('./dynamo/DynamoModel');

class TenantModel extends DynamoModel {
  constructor() {
    super('tenants');
  }
}

const Tenant = new TenantModel();
module.exports = Tenant;
