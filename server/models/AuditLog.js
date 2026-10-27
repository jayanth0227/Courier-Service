const DynamoModel = require('./dynamo/DynamoModel');

class AuditLogModel extends DynamoModel {
  constructor() {
    super('auditlogs');
  }
}

const AuditLog = new AuditLogModel();
module.exports = AuditLog;
