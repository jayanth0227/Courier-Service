const DynamoModel = require('./dynamo/DynamoModel');

class DestinationModel extends DynamoModel {
  constructor() {
    super('destinations');
  }
}

const Destination = new DestinationModel();
module.exports = Destination;
