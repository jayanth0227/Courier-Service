const { rawClient, initAllTables } = require('./dynamoClient');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const connectDB = async () => {
  try {
    const res = await rawClient.send(new ListTablesCommand({}));
    const region = process.env.AWS_REGION || 'ap-south-2';
    console.log(`[Database] ✅ AWS DynamoDB Connected successfully in ${region} (${res.TableNames?.length || 0} tables active)`);

    // Ensure all tables exist
    await initAllTables();
    return { connection: { host: `dynamodb.${region}.amazonaws.com` } };
  } catch (error) {
    console.error(`[Database Error] AWS DynamoDB connection failed: ${error.message}`);
    return null;
  }
};

module.exports = connectDB;
