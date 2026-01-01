/**
 * Sync Meter Data to SolarPowerMeter Daily Generation
 *
 * This script:
 * 1. Connects to the unified MongoDB database
 * 2. Reads meter data from WeatherMeterManagement
 * 3. Groups by date and calculates daily totals
 * 4. Syncs to SolarPowerMeter's DailyGeneration collection
 */

const mongoose = require('mongoose');

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://inverterOP:inverterOP@cluster0.pnxrna2.mongodb.net/unified_energy_management?retryWrites=true&w=majority&appName=Cluster0';

// Define Schemas
const SiteSchema = new mongoose.Schema({
  siteName: String,
  siteNumber: Number,
  capacity: Number
});

const MeterSchema = new mongoose.Schema({
  date: String,
  time: String,
  siteName: String,
  plantStartTime: String,
  plantStopTime: String,
  total: String,
  activeEnergyExport: Number,
  status: String
}, { timestamps: true });

const DailyGenerationSchema = new mongoose.Schema({
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  date: Date,
  dailyGeneration: Number,
  status: String
}, { timestamps: true });

const Site = mongoose.model('Site', SiteSchema);
const Meter = mongoose.model('Meter', MeterSchema);
const DailyGeneration = mongoose.model('DailyGeneration', DailyGenerationSchema);

async function syncMeterToDaily() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Get or create Site-A
    let site = await Site.findOne({ siteName: 'Site-A' });
    if (!site) {
      console.log('Creating Site-A...');
      site = await Site.create({
        siteName: 'Site-A',
        siteNumber: 1,
        capacity: 1000 // kW - update this to actual capacity
      });
      console.log('✅ Created Site-A:', site);
    } else {
      console.log('✅ Found Site-A:', site);
    }

    // Step 2: Get all meter data
    const meterData = await Meter.find({ status: 'draft' }).lean();
    console.log(`Found ${meterData.length} meter records`);

    if (meterData.length === 0) {
      console.log('⚠️  No meter data found');
      return;
    }

    // Debug: Show first record to see available fields
    if (meterData.length > 0) {
      console.log('\n📊 Sample meter record fields:');
      console.log(JSON.stringify(meterData[0], null, 2));
      console.log('');
    }

    // Step 3: Group by date and calculate daily totals
    const dailyTotals = {};

    for (const record of meterData) {
      const date = record.date; // Format: 22-Jun-25

      if (!dailyTotals[date]) {
        dailyTotals[date] = {
          date: date,
          totalExport: 0,
          count: 0
        };
      }

      // Try to find export value from various possible fields
      const exportValue = record.activeEnergyExport
        || record['GSS Export Total']
        || record['Net Export @GSS']
        || record['Export 1 Total']
        || record['Export 2 Total']
        || record['Export 3 Total']
        || 0;

      dailyTotals[date].totalExport += exportValue;
      dailyTotals[date].count++;
    }

    console.log(`Grouped into ${Object.keys(dailyTotals).length} daily records`);

    // Step 4: Convert dates and insert into DailyGeneration
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const [dateStr, data] of Object.entries(dailyTotals)) {
      try {
        // Parse DD-MMM-YY format to Date
        const dateObj = parseDDMMMYY(dateStr);

        if (!dateObj) {
          console.error(`❌ Failed to parse date: ${dateStr}`);
          errors++;
          continue;
        }

        console.log(`Processing ${dateStr} → ${dateObj.toISOString()} | Generation: ${data.totalExport} kWh`);

        // Upsert (insert or update)
        const result = await DailyGeneration.findOneAndUpdate(
          { site: site._id, date: dateObj },
          {
            site: site._id,
            date: dateObj,
            dailyGeneration: data.totalExport,
            status: 'draft'
          },
          { upsert: true, new: true }
        );

        if (result) {
          inserted++;
          console.log(`  ✅ Synced: ${dateStr} with ${data.totalExport} kWh`);
        }
      } catch (error) {
        console.error(`  ❌ Error syncing ${dateStr}:`, error.message);
        errors++;
      }
    }

    console.log('\n========== SYNC SUMMARY ==========');
    console.log(`Total dates processed: ${Object.keys(dailyTotals).length}`);
    console.log(`Successfully synced: ${inserted}`);
    console.log(`Errors: ${errors}`);
    console.log('===================================\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Parse date formats:
 * - DD-MM-YYYY (e.g., "22-06-2025")
 * - DD-MMM-YY (e.g., "22-Jun-25")
 */
function parseDDMMMYY(dateStr) {
  if (!dateStr) return null;

  const str = String(dateStr).trim();

  // Try DD-MM-YYYY format first
  const ddmmyyyyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Month is 0-indexed
    const year = parseInt(ddmmyyyyMatch[3], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  // Try DD-MMM-YY format
  const ddmmmyyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddmmmyyMatch) {
    const day = parseInt(ddmmmyyMatch[1], 10);
    const monthStr = ddmmmyyMatch[2].toLowerCase();
    const yearShort = parseInt(ddmmmyyMatch[3], 10);

    // Month mapping
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const month = months[monthStr];
    if (month === undefined) return null;

    // Convert 2-digit year to 4-digit (25 → 2025)
    const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;

    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  return null;
}

// Run the sync
syncMeterToDaily()
  .then(() => {
    console.log('✅ Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
