const DynamoModel = require('./dynamo/DynamoModel');

class BookingModel extends DynamoModel {
  constructor() {
    super('bookings');
  }
}

const Booking = new BookingModel();
module.exports = Booking;
