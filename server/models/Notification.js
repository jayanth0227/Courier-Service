const DynamoModel = require('./dynamo/DynamoModel');

class NotificationModel extends DynamoModel {
  constructor() {
    super('notifications');
  }
}

const Notification = new NotificationModel();
module.exports = Notification;
