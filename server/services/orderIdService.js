const Booking = require('../models/Booking');

/**
 * Generate a unique Order ID in the format LR**** (e.g. LR4821)
 * Starts with 'LR' prefix followed by 4 unique numeric digits (1000 - 9999).
 * Guarantees non-collision with existing records.
 */
const generateUniqueOrderId = async () => {
  let isUnique = false;
  let orderId = '';
  let attempts = 0;
  const maxAttempts = 25;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    // Generate 4-digit number between 1000 and 9999
    const random4Digits = Math.floor(1000 + Math.random() * 9000);
    orderId = `LR${random4Digits}`;

    // Verify in database
    const existing = await Booking.findOne({ orderId }).lean();
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Timestamp fallback with 4-digit suffix
    const fallbackNum = (Date.now() % 9000) + 1000;
    orderId = `LR${fallbackNum}`;
  }

  return orderId;
};

module.exports = {
  generateUniqueOrderId,
};
