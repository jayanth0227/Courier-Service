const DynamoModel = require('./dynamo/DynamoModel');

class BusDispatchModel extends DynamoModel {
  constructor() {
    super('busdispatches');
  }
}

const BusDispatch = new BusDispatchModel();
module.exports = BusDispatch;
