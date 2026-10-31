const assert = require('assert');
const whatsappService = require('../services/whatsappService');

console.log('--- Testing WhatsApp Message Builders without Payment ---');

// Test 1: Dispatch Message
const dispatchMsg = whatsappService.buildDispatchMessage({
  orderId: 'ORD123456',
  recipientRole: 'CUSTOMER',
  recipientName: 'Ravi Teja',
  customerName: 'Ravi Teja',
  busNumber: 'AP16 TJ 9999',
  busName: 'Kaveri Travels',
  toCity: 'Vijayawada',
  destinationAddress: 'Benz Circle',
  amount: 250,
  paymentStatus: 'TO PAY',
  driverName: 'Suresh',
  driverPhone: '9876543210',
  companyName: 'Express Logistics',
  companyPhone: '9999999999',
});

console.log('\n--- Generated Dispatch Message ---\n' + dispatchMsg);

assert.strictEqual(
  dispatchMsg.toLowerCase().includes('payment'),
  false,
  'Dispatch message should NOT contain "payment"'
);
assert.strictEqual(
  dispatchMsg.includes('TO PAY'),
  false,
  'Dispatch message should NOT contain "TO PAY"'
);
assert.strictEqual(
  dispatchMsg.includes('PAID'),
  false,
  'Dispatch message should NOT contain "PAID"'
);
assert(dispatchMsg.includes('LR Number: #ORD123456'), 'Should contain LR number');
assert(dispatchMsg.includes('Benz Circle'), 'Should contain delivery counter');
assert(dispatchMsg.includes('AP16 TJ 9999'), 'Should contain bus number');

// Test 2: Booking Confirmation Message
const confirmationMsg = whatsappService.buildBookingConfirmationMessage({
  orderId: 'ORD123456',
  recipientName: 'Sita',
  customerName: 'Sita',
  fromCity: 'Hyderabad',
  toCity: 'Vijayawada',
  deliveryAddress: 'Railway Station',
  amount: 450,
  paymentStatus: 'PAID',
  remarks: 'Fragile electronics',
  companyName: 'Express Logistics',
  companyPhone: '9999999999',
});

console.log('\n--- Generated Confirmation Message ---\n' + confirmationMsg);

assert.strictEqual(
  confirmationMsg.toLowerCase().includes('payment'),
  false,
  'Booking confirmation message should NOT contain "payment"'
);
assert.strictEqual(
  confirmationMsg.includes('TO PAY'),
  false,
  'Booking confirmation message should NOT contain "TO PAY"'
);
assert.strictEqual(
  confirmationMsg.includes('PAID'),
  false,
  'Booking confirmation message should NOT contain "PAID"'
);
assert(confirmationMsg.includes('LR Number: #ORD123456'), 'Should contain LR number');
assert(confirmationMsg.includes('Railway Station'), 'Should contain delivery stop');
assert(confirmationMsg.includes('Hyderabad → Vijayawada'), 'Should contain route');

console.log('\n✓ ALL WHATSAPP MESSAGE TESTS PASSED! No payment info in messages.\n');
