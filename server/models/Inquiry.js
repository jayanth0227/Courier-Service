const DynamoModel = require('./dynamo/DynamoModel');

class InquiryModel extends DynamoModel {
  constructor() {
    super('inquiries');
  }
}

const Inquiry = new InquiryModel();
module.exports = Inquiry;
