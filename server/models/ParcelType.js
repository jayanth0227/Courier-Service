const DynamoModel = require('./dynamo/DynamoModel');

class ParcelTypeModel extends DynamoModel {
  constructor() {
    super('parceltypes');
  }
}

const ParcelType = new ParcelTypeModel();
module.exports = ParcelType;
