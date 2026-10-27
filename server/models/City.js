const DynamoModel = require('./dynamo/DynamoModel');

class CityModel extends DynamoModel {
  constructor() {
    super('cities');
  }
}

const City = new CityModel();
module.exports = City;
