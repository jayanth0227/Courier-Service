require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const City = require('./server/models/City');
const Booking = require('./server/models/Booking');
const { generateUniqueOrderId } = require('./server/services/orderIdService');

async function testFromToCities() {
  console.log('=== Testing Dynamic From/To Cities & Delivery Details Persistence ===');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB Connected');

  // 1. Total cities in database
  const count = await City.countDocuments();
  console.log(`✓ Total Cities in MongoDB: ${count}`);

  // 2. Add New Dynamic City
  const testCityName = 'Anantapur Hub Dynamic';
  const testCounterAddress = 'Tower Clock Junction, RTC Bus Stand Counter #3, Anantapur';
  const testCollectionPoints = [
    'RTC Bus Stand Counter #3, Anantapur',
    'Sapthagiri Circle Drop Hub, Anantapur',
  ];

  await City.deleteOne({ name: testCityName });

  const newCity = await City.create({
    name: testCityName,
    state: 'Andhra Pradesh',
    counterAddress: testCounterAddress,
    collectionPoints: testCollectionPoints,
    contactPerson: 'Anantapur Desk Manager',
    contactPhone: '9848055667',
    standardCharge: 320,
    dispatchSchedule: 'Daily 04:00 PM & 08:30 PM',
    active: true,
  });
  console.log(`✓ Created Dynamic City: '${newCity.name}' with ID ${newCity._id}`);
  console.log(`  - Counter Address: ${newCity.counterAddress}`);
  console.log(`  - Collection Hubs: ${newCity.collectionPoints.join(' | ')}`);
  console.log(`  - Standard Rate: ₹${newCity.standardCharge}`);

  // 3. Create Booking with From: Hyderabad and To: Anantapur Hub Dynamic
  const orderId = await generateUniqueOrderId();
  const testBooking = await Booking.create({
    orderId,
    customerName: 'Rayalaseema Cotton Mills',
    customerPhone: '9848011223',
    customerWhatsapp: '9848011223',
    fromCity: 'Hyderabad',
    toCity: newCity.name,
    destination: `Hyderabad → ${newCity.name}`,
    deliveryAddress: newCity.counterAddress,
    receiverName: newCity.contactPerson,
    receiverPhone: newCity.contactPhone,
    parcelType: 'Carton',
    quantity: 4,
    weight: 40,
    amount: newCity.standardCharge,
    status: 'WAITING_FOR_BUS',
  });
  console.log(`✓ Booking Created with From & To Cities: Order #${testBooking.orderId}`);
  console.log(`  - From City: ${testBooking.fromCity}`);
  console.log(`  - To City: ${testBooking.toCity}`);
  console.log(`  - Delivery Address: ${testBooking.deliveryAddress}`);
  console.log(`  - Amount: ₹${testBooking.amount}`);

  // 4. Verify MongoDB query
  const retrieved = await Booking.findOne({ orderId }).lean();
  if (retrieved.fromCity !== 'Hyderabad' || retrieved.toCity !== testCityName) {
    throw new Error('From/To city verification failed!');
  }
  console.log('✓ Successfully retrieved booking with accurate fromCity and toCity from MongoDB');

  // 5. Clean up test records
  await Booking.deleteOne({ orderId });
  await City.deleteOne({ _id: newCity._id });
  console.log('✓ Cleaned up test booking and city');

  console.log('=== ALL FROM & TO DESTINATION CITY TESTS PASSED! ===');
  await mongoose.disconnect();
}

testFromToCities().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
