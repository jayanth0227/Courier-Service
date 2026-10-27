const DynamoModel = require('./dynamo/DynamoModel');

class BusModel extends DynamoModel {
  constructor() {
    super('buses');
  }
}

const Bus = new BusModel();
module.exports = Bus;
