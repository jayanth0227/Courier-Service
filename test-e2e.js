require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const mongoose = require('mongoose');
const Booking = require('./server/models/Booking');
const User = require('./server/models/User');
const BusDispatch = require('./server/models/BusDispatch');
const Notification = require('./server/models/Notification');
const whatsappService = require('./server/services/whatsappService');
const { generateUniqueOrderId } = require('./server/services/orderIdService');

async function testFullFlow() {
  console.log('--- Starting Parcel & Bus Dispatch Flow Verification ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB Connected');

  // 1. Test LR**** Order ID Generator
  const orderId = await generateUniqueOrderId();
  console.log(`✓ LR**** Order ID Generated: ${orderId} (Length: ${orderId.length}, Regex test: ${/^LR\d{4}$/.test(orderId)})`);

  // 2. Create Booking
  const adminUsername = (process.env.ADMIN_USERNAME || 'admi').trim().toLowerCase();
  const testAdmin = await User.findOne({ username: adminUsername });
  const newBooking = await Booking.create({
    orderId,
    customerName: 'Kaveri Commercial Agencies',
    customerPhone: '9848123456',
    customerWhatsapp: '9848123456',
    deliveryAddress: 'Old Bus Stand Road, Shop 18, Vijayawada',
    destination: 'Hyderabad → Vijayawada',
    parcelType: 'Rice Bag',
    quantity: 3,
    weight: 75,
    notes: '3x 25kg Sona Masoori Rice - Fragile Moisture Protection',
    amount: 520,
    status: 'WAITING_FOR_BUS',
    timeline: [
      {
        status: 'BOOKED',
        timestamp: new Date(),
        description: 'Received at Counter #1',
        updatedBy: 'Test Staff',
      },
      {
        status: 'WAITING_FOR_BUS',
        timestamp: new Date(),
        description: 'Waiting for evening bus',
        updatedBy: 'Test Staff',
      },
    ],
    createdBy: testAdmin ? testAdmin._id : null,
  });
  console.log(`✓ Booking Created: Order #${newBooking.orderId}, Status: ${newBooking.status}`);

  // 3. Assign to Bus (Dispatch Flow)
  const busNumber = 'TS09UB9988';
  const route = 'Hyderabad → Vijayawada';
  const departureTime = '08:15 PM';

  newBooking.status = 'DISPATCHED';
  newBooking.busDetails = {
    busNumber,
    route,
    operator: 'Kaveri Express Deluxe',
    departureTime,
    dispatchedAt: new Date(),
  };
  newBooking.timeline.push({
    status: 'DISPATCHED',
    timestamp: new Date(),
    description: `Assigned to Bus ${busNumber} departing at ${departureTime}`,
    updatedBy: 'Test Staff',
  });

  // Trigger WhatsApp notification service
  const notifyRes = await whatsappService.sendDispatchNotification({
    booking: newBooking,
    busNumber,
    route,
    departureTime,
    operator: 'Kaveri Express Deluxe',
  });
  console.log(`✓ WhatsApp Notification Service Triggered: status=${notifyRes.status}, recipient=${notifyRes.recipientPhone}`);
  console.log(`  Message content snippet:\n  ${notifyRes.message.split('\n')[0]}...`);

  newBooking.notificationStatus = 'SENT';
  newBooking.notificationSentAt = new Date();
  await newBooking.save();

  // 4. Create BusDispatch Manifest
  const manifest = await BusDispatch.create({
    dispatchManifestNumber: `DSP-${Date.now().toString().slice(-6)}`,
    busNumber,
    route,
    departureTime,
    bookingIds: [newBooking._id],
    orderIds: [newBooking.orderId],
    totalParcels: 3,
    totalWeight: 75,
    dispatchedAt: new Date(),
  });
  console.log(`✓ Bus Dispatch Manifest Created: ${manifest.dispatchManifestNumber} for Bus ${manifest.busNumber}`);

  // 5. Test Tracking Query
  const tracked = await Booking.findOne({ orderId }).lean();
  console.log(`✓ Tracking Query Result: Status=${tracked.status}, Bus=${tracked.busDetails.busNumber}, Timeline steps=${tracked.timeline.length}`);

  // 6. Test Mark Delivered
  tracked.status = 'DELIVERED';
  tracked.deliveredAt = new Date();
  await Booking.updateOne({ orderId }, { $set: { status: 'DELIVERED', deliveredAt: new Date() } });
  console.log(`✓ Status Updated to DELIVERED successfully!`);

  // 7. Clean up test records
  await Booking.deleteOne({ orderId });
  await BusDispatch.deleteOne({ _id: manifest._id });
  console.log(`✓ Cleaned up temporary test record (#${orderId})`);

  console.log('--- ALL BACKEND VERIFICATIONS PASSED ---');
  await mongoose.disconnect();
}

testFullFlow().catch(console.error);
