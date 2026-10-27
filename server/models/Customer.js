const DynamoModel = require('./dynamo/DynamoModel');

class CustomerModel extends DynamoModel {
  constructor() {
    super('customers');
  }
}

const Customer = new CustomerModel();
module.exports = Customer;
