/**
 * Migration Script: Add status field to existing generation records
 *
 * This script updates all existing records to have status='draft'
 *
 * Run this script once using: node update-status-to-draft.js
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGO_URI = 'mongodb+srv://dev_db_user:SolarOP@solarpower.srhibfk.mongodb.net/?appName=SolarPower';

async function migrateData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Update DailyGeneration collection
    const dailyResult = await db.collection('dailygenerations').updateMany(
      { status: { $exists: false } }, // Only update records without status field
      { $set: { status: 'draft' } }
    );

    console.log(`✅ DailyGeneration Collection: Updated ${dailyResult.modifiedCount} records`);

    // Update MonthlyGeneration collection
    const monthlyResult = await db.collection('monthlygenerations').updateMany(
      { status: { $exists: false } }, // Only update records without status field
      { $set: { status: 'draft' } }
    );

    console.log(`✅ MonthlyGeneration Collection: Updated ${monthlyResult.modifiedCount} records`);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the migration
migrateData();
