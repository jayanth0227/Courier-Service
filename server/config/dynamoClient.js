const { DynamoDBClient, ListTablesCommand, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const path = require('path');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const region = process.env.AWS_REGION || 'ap-south-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'mrcargo_';

if (!accessKeyId || !secretAccessKey) {
  console.warn('[AWS DynamoDB Warning] AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not defined in .env');
}

const rawClient = new DynamoDBClient({
  region,
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
});

const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
    convertClassInstanceToMap: true,
  },
});

// All 14 system entities that require DynamoDB tables
const SYSTEM_TABLES = [
  'settings',
  'users',
  'tenants',
  'bookings',
  'buses',
  'drivers',
  'busdispatches',
  'cities',
  'destinations',
  'customers',
  'inquiries',
  'notifications',
  'parceltypes',
  'auditlogs',
];

const getFullTableName = (entityName) => {
  const clean = entityName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${tablePrefix}${clean}`;
};

/**
 * Automatically provision all missing DynamoDB tables in AWS
 */
const initAllTables = async () => {
  try {
    const listRes = await rawClient.send(new ListTablesCommand({}));
    const existingTables = new Set(listRes.TableNames || []);
    console.log(`[DynamoDB] Connecting to AWS Region ${region}. Found ${existingTables.size} existing tables.`);

    for (const entity of SYSTEM_TABLES) {
      const tableName = getFullTableName(entity);
      if (!existingTables.has(tableName)) {
        console.log(`[DynamoDB Provisioning] Creating table "${tableName}" with PAY_PER_REQUEST on-demand billing...`);
        try {
          await rawClient.send(
            new CreateTableCommand({
              TableName: tableName,
              AttributeDefinitions: [
                { AttributeName: 'id', AttributeType: 'S' },
              ],
              KeySchema: [
                { AttributeName: 'id', KeyType: 'HASH' },
              ],
              BillingMode: 'PAY_PER_REQUEST',
            })
          );
          console.log(`[DynamoDB Provisioning] ✅ Table "${tableName}" created successfully in AWS.`);
        } catch (err) {
          if (err.name !== 'ResourceInUseException') {
            console.error(`[DynamoDB Error] Failed to create table "${tableName}":`, err.message);
          }
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error('[DynamoDB Init Error] Could not list/create tables in AWS:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  rawClient,
  docClient,
  tablePrefix,
  getFullTableName,
  initAllTables,
  SYSTEM_TABLES,
};
