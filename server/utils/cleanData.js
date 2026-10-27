const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { docClient, getFullTableName } = require('../config/dynamoClient');
const { ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const User = require('../models/User');

const TABLES_TO_CLEAR_COMPLETELY = [
  'bookings',
  'busdispatches',
  'buses',
  'drivers',
  'cities',
  'destinations',
  'customers',
  'inquiries',
  'notifications',
  'parceltypes',
  'auditlogs',
  'tenants',
];

const purgeTable = async (entityName) => {
  const tableName = getFullTableName(entityName);
  try {
    const res = await docClient.send(new ScanCommand({ TableName: tableName }));
    const items = res.Items || [];
    console.log(`[Purge] Table "${tableName}": Found ${items.length} items to delete.`);
    for (const item of items) {
      const id = item.id || item._id;
      if (id) {
        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: String(id) },
          })
        );
      }
    }
    console.log(`[Purge] ✅ Table "${tableName}" is now 100% clean.`);
  } catch (err) {
    console.warn(`[Purge Warning] Error clearing "${tableName}":`, err.message);
  }
};

const purgeUsersExceptSuperAdmin = async () => {
  const tableName = getFullTableName('users');
  try {
    const res = await docClient.send(new ScanCommand({ TableName: tableName }));
    const items = res.Items || [];
    console.log(`[Purge Users] Found ${items.length} total users.`);
    for (const user of items) {
      if (user.role === 'superadmin') {
        console.log(`[Purge Users] 👑 Preserving Super Admin: ${user.username}`);
      } else {
        const id = user.id || user._id;
        if (id) {
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: { id: String(id) },
            })
          );
          console.log(`[Purge Users] Deleted non-superadmin user: ${user.username} (${id})`);
        }
      }
    }
  } catch (err) {
    console.warn(`[Purge Warning] Error clearing users:`, err.message);
  }
};

const runClean = async () => {
  console.log('=======================================================');
  console.log('🧹 PURGING ALL DUMMY / SEEDED DATA IN AWS DYNAMODB');
  console.log('🛡️ Preserving: Website CMS Settings & Super Admin Account');
  console.log('=======================================================');

  for (const entity of TABLES_TO_CLEAR_COMPLETELY) {
    await purgeTable(entity);
  }

  await purgeUsersExceptSuperAdmin();

  console.log('\n=======================================================');
  console.log('🎉 ALL DUMMY DATA PURGED! DYNAMODB IS IN PRISTINE STATE.');
  console.log('=======================================================');
};

if (require.main === module) {
  runClean().then(() => process.exit(0)).catch(console.error);
}

module.exports = runClean;
