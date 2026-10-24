const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const obsoleteIndexes = [
  { collection: 'cities', index: 'name_1' },
  { collection: 'buses', index: 'busNumber_1' },
  { collection: 'destinations', index: 'route_1' },
  { collection: 'parceltypes', index: 'name_1' },
  { collection: 'customers', index: 'phone_1' },
  { collection: 'drivers', index: 'phone_1' },
];

async function fixIndexes() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to', mongoose.connection.name);

  for (const item of obsoleteIndexes) {
    try {
      const exists = await mongoose.connection.db
        .collection(item.collection)
        .indexExists(item.index);
      if (exists) {
        console.log(`Dropping obsolete legacy index '${item.index}' on '${item.collection}'...`);
        await mongoose.connection.db.collection(item.collection).dropIndex(item.index);
        console.log(`✓ Successfully dropped '${item.index}' on '${item.collection}'`);
      } else {
        console.log(`- Index '${item.index}' on '${item.collection}' not present, skipping.`);
      }
    } catch (err) {
      console.warn(`Notice dropping ${item.index} on ${item.collection}:`, err.message);
    }
  }

  // Now trigger Mongoose to rebuild all current schema indexes
  console.log('\nSyncing all current tenant-scoped compound indexes...');
  const models = [
    require('../server/models/Tenant'),
    require('../server/models/User'),
    require('../server/models/Booking'),
    require('../server/models/Customer'),
    require('../server/models/City'),
    require('../server/models/Destination'),
    require('../server/models/ParcelType'),
    require('../server/models/Bus'),
    require('../server/models/Driver'),
    require('../server/models/BusDispatch'),
    require('../server/models/Setting'),
  ];

  for (const model of models) {
    await model.syncIndexes();
    console.log(`✓ Synchronized compound indexes for model: ${model.modelName}`);
  }

  console.log('\n🎉 ALL LEGACY INDEXES CLEANED & COMPOUND PER-TENANT INDEXES SYNCHRONIZED!');
  await mongoose.disconnect();
}

fixIndexes().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
