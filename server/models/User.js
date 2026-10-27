const DynamoModel = require('./dynamo/DynamoModel');

class UserModel extends DynamoModel {
  constructor() {
    super('users', { hasPassword: true });
  }
}

const User = new UserModel();
module.exports = User;
