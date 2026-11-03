const assert = require('assert');
const whatsappService = require('../services/whatsappService');

console.log('--- Testing WhatsApp Message Builders without Payment ---');

// Test 1: Sender Booking Confirmation Message
const senderConfirmationMsg = whatsappService.buildBookingConfirmationMessage({
  orderId: 'ORD123456',
  recipientRole: 'SENDER',
  recipientName: 'Ravi Kumar',
  customerName: 'Ravi Kumar',
  fromCity: 'Hyderabad',
  toCity: 'Vijayawada',
  deliveryAddress: 'Railway Station',
  amount: 450,
  paymentStatus: 'PAID',
  remarks: 'Fragile electronics',
  companyName: 'Mr Cargo',
  companyPhone: '9999999999',
});

console.log('\n--- Generated Sender Confirmation Message ---\n' + senderConfirmationMsg);

assert(senderConfirmationMsg.includes('*Mr Cargo - Booking Confirmation*'), 'Should have header');
assert(senderConfirmationMsg.includes('Dear Ravi Kumar, your parcel has been booked successfully.'), 'Should address sender');
assert(senderConfirmationMsg.includes('• LR Number: #ORD123456'), 'Should contain LR number');
assert(senderConfirmationMsg.includes('• Route: Hyderabad → Vijayawada'), 'Should contain route');
assert(senderConfirmationMsg.includes('• Delivery Stop: Vijayawada - Railway Station'), 'Should contain delivery stop');
assert(senderConfirmationMsg.includes('• Remarks: Fragile electronics'), 'Should contain remarks');
assert(senderConfirmationMsg.includes('https://mrcargo.online/#track?id=ORD123456'), 'Should contain tracking URL');
assert(senderConfirmationMsg.includes('Help: 9999999999'), 'Should contain help phone');

// Test 2: Receiver Booking Confirmation Message
const receiverConfirmationMsg = whatsappService.buildBookingConfirmationMessage({
  orderId: 'ORD123456',
  recipientRole: 'RECEIVER',
  recipientName: 'Sita Devi',
  customerName: 'Ravi Kumar',
  fromCity: 'Hyderabad',
  toCity: 'Vijayawada',
  deliveryAddress: 'Benz Circle',
  amount: 450,
  paymentStatus: 'TO PAY',
  companyName: 'Mr Cargo',
  companyPhone: '9999999999',
});

console.log('\n--- Generated Receiver Confirmation Message ---\n' + receiverConfirmationMsg);

assert(receiverConfirmationMsg.includes('*Mr Cargo - Booking Confirmation*'), 'Should have header');
assert(receiverConfirmationMsg.includes('Dear Sita Devi, your parcel has been booked successfully.'), 'Should address receiver');
assert(receiverConfirmationMsg.includes('• LR Number: #ORD123456'), 'Should contain LR number');
assert(receiverConfirmationMsg.includes('• Delivery Stop: Vijayawada - Benz Circle'), 'Should contain delivery stop');

// Test 3: Verify No Payment Info In Confirmation
assert.strictEqual(
  senderConfirmationMsg.toLowerCase().includes('to pay'),
  false,
  'Booking confirmation message should NOT contain "to pay"'
);
assert.strictEqual(
  senderConfirmationMsg.toLowerCase().includes('paid'),
  false,
  'Booking confirmation message should NOT contain "paid"'
);

// Test 4: Verify sendBookingConfirmation formats both recipients
async function testSendBookingConfirmationMock() {
  const dummyBooking = {
    _id: 'mock_booking_1',
    orderId: '654321',
    tenantId: 'tenant_1',
    customerName: 'Sender User',
    customerPhone: '9876543210',
    customerWhatsapp: '9876543210',
    receiverName: 'Receiver User',
    receiverPhone: '9123456789',
    receiverWhatsapp: '9123456789',
    fromCity: 'Hyderabad',
    toCity: 'Bangalore',
    deliveryAddress: 'Majestic Stop',
    amount: 500,
    paymentStatus: 'PAID',
    remarks: 'Handle with care',
    save: async function() { this.saved = true; },
  };

  const results = await whatsappService.sendBookingConfirmation(dummyBooking, 'tenant_1');
  console.log('\n--- sendBookingConfirmation Mock Results ---', results);

  assert(Array.isArray(results), 'Results should be an array');
  assert.strictEqual(results.length, 2, 'Should send to both Sender and Receiver');
  assert.strictEqual(results[0].recipientRole, 'SENDER', 'First recipient is Sender');
  assert.strictEqual(results[1].recipientRole, 'RECEIVER', 'Second recipient is Receiver');
  assert.strictEqual(results.success, true, 'Mock send should succeed');
  assert.strictEqual(dummyBooking.notificationStatus, 'SENT', 'Booking notificationStatus should be SENT');
  assert(dummyBooking.saved, 'Booking should be saved with notification status');
  assert(results[0].directLink.includes('wa.me/919876543210'), 'Should generate direct WhatsApp link for Sender');
  assert(results[1].directLink.includes('wa.me/919123456789'), 'Should generate direct WhatsApp link for Receiver');
  console.log('\n✓ Dual recipient (Sender + Receiver) booking confirmation verified!');
}

testSendBookingConfirmationMock().then(() => {
  console.log('\n✓ ALL WHATSAPP NOTIFICATION TESTS PASSED!\n');
}).catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
