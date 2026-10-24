require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const Destination = require('./server/models/Destination');
const Setting = require('./server/models/Setting');
const Booking = require('./server/models/Booking');
const { generateUniqueOrderId } = require('./server/services/orderIdService');

async function testDestinationFeatures() {
  console.log('=== Testing Destination & Delivery Details Database Dynamic Persistence ===');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB Connected');

  // 1. Check destinations count / seeding
  const count = await Destination.countDocuments();
  console.log(`✓ Total Destinations in MongoDB: ${count}`);

  // 2. Add New Dynamic Destination & Delivery Hub
  const testRouteName = 'Hyderabad → Nizamabad Dynamic Test';
  const testDeliveryAddress = 'Main Bus Stand Counter #4, Near Railway Station Road, Nizamabad';
  const testCollectionPoints = [
    'Main Bus Stand Counter #4, Near Railway Station Road, Nizamabad',
    'Subhash Nagar Cargo Drop Point, Nizamabad',
    'Khaleelwadi Commercial Counter, Nizamabad',
  ];

  // Clean up any old test destination
  await Destination.deleteOne({ route: testRouteName });

  const newDest = await Destination.create({
    route: testRouteName,
    fromCity: 'Hyderabad',
    toCity: 'Nizamabad',
    deliveryAddress: testDeliveryAddress,
    collectionPoints: testCollectionPoints,
    receiverName: 'Nizamabad Depot In-Charge',
    receiverPhone: '9848011223',
    standardCharge: 280,
    dispatchSchedule: 'Daily 05:30 PM & 09:30 PM',
    active: true,
  });
  console.log(`✓ Created Dynamic Destination: '${newDest.route}' with ID ${newDest._id}`);
  console.log(`  - Default Delivery Address: ${newDest.deliveryAddress}`);
  console.log(`  - Collection Points (${newDest.collectionPoints.length}): ${newDest.collectionPoints.join(' | ')}`);
  console.log(`  - Standard Charge: ₹${newDest.standardCharge}`);

  // 3. Verify Retrieval from Database
  const fetched = await Destination.findById(newDest._id);
  if (!fetched || fetched.route !== testRouteName || fetched.deliveryAddress !== testDeliveryAddress) {
    throw new Error('Destination retrieval verification failed!');
  }
  console.log('✓ Verified dynamic destination correctly stored and retrieved from MongoDB database');

  // 4. Test Update Destination & Delivery Details
  fetched.deliveryAddress = 'Updated New Complex Counter #9, Clock Tower, Nizamabad';
  fetched.standardCharge = 310;
  await fetched.save();

  const updatedCheck = await Destination.findById(newDest._id);
  if (updatedCheck.deliveryAddress !== 'Updated New Complex Counter #9, Clock Tower, Nizamabad' || updatedCheck.standardCharge !== 310) {
    throw new Error('Destination update verification failed!');
  }
  console.log(`✓ Verified dynamic update saved to database: New Address = '${updatedCheck.deliveryAddress}', New Charge = ₹${updatedCheck.standardCharge}`);

  // 5. Test Creating a Booking with this Destination & Delivery Address
  const orderId = await generateUniqueOrderId();
  const testBooking = await Booking.create({
    orderId,
    customerName: 'Sri Balaji Electricals',
    customerPhone: '9848012345',
    customerWhatsapp: '9848012345',
    destination: updatedCheck.route,
    deliveryAddress: updatedCheck.deliveryAddress,
    receiverName: updatedCheck.receiverName,
    receiverPhone: updatedCheck.receiverPhone,
    parcelType: 'Box',
    quantity: 2,
    weight: 15,
    amount: updatedCheck.standardCharge,
    status: 'WAITING_FOR_BUS',
  });
  console.log(`✓ Booking Created with Dynamic Destination: Order #${testBooking.orderId}`);
  console.log(`  - Destination: ${testBooking.destination}`);
  console.log(`  - Delivery Address: ${testBooking.deliveryAddress}`);
  console.log(`  - Amount: ₹${testBooking.amount}`);

  // 6. Clean up test records
  await Booking.deleteOne({ orderId });
  await Destination.deleteOne({ _id: newDest._id });
  console.log('✓ Cleaned up test booking and destination record');

  console.log('=== ALL DESTINATION & DELIVERY PERSISTENCE TESTS PASSED SUCCESSFULLY! ===');
  await mongoose.disconnect();
}

testDestinationFeatures().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
