const DynamoModel = require('./dynamo/DynamoModel');

class DriverModel extends DynamoModel {
  constructor() {
    super('drivers');
  }
}

const Driver = new DriverModel();
module.exports = Driver;
