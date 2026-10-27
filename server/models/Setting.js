const DynamoModel = require('./dynamo/DynamoModel');

class SettingModel extends DynamoModel {
  constructor() {
    super('settings');
  }
}

const Setting = new SettingModel();
module.exports = Setting;
