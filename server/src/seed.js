const mongoose = require('mongoose');
const dotenv = require('dotenv-safe');
const { Site, BuildGeneration, DailyGeneration, User, Alert } = require('./models');

dotenv.config({ path: './.env' });

// Seasonality Factors (Cloud cover/Sun angle)
// Apr-May: Peak summer (1.2), Jun-Aug: Monsoon (0.6), Sep-Oct: Post-monsoon (1.0), Nov-Feb: Winter (0.8), Mar: Pre-summer (1.1)
const SEASONALITY = {
    apr: 1.2, may: 1.25, jun: 0.8, jul: 0.6, aug: 0.65, sep: 0.9,
    oct: 1.0, nov: 0.85, dec: 0.8, jan: 0.75, feb: 0.9, mar: 1.1
};

const seed = async () => {
    try {
        console.log('Connecting to MongoDB for Dynamic Algorithmic Seeding...');
        await mongoose.connect(process.env.MONGO_URI);

        console.log('Clearing existing records...');
        await Site.deleteMany({});
        await BuildGeneration.deleteMany({});
        await DailyGeneration.deleteMany({});
        await User.deleteMany({});
        await Alert.deleteMany({});

        // 0. Create Enterprise Users
        console.log('Generating Enterprise Personnel...');
        await User.create([
            { username: 'admin', password: 'admin123', role: 'ADMIN' },
            { username: 'op', password: 'op123', role: 'OPERATOR' },
            { username: 'viewer', password: 'viewer123', role: 'VIEWER' }
        ]);


        // 1. Create Dynamic Sites
        const siteConfigs = [
            { name: 'Radiant Valley Solar', cap: 5000 },
            { name: 'Eco-Volt Industrial', cap: 1200 },
            { name: 'City Center Rooftop', cap: 250 }
        ];

        const sites = [];
        for (let i = 0; i < siteConfigs.length; i++) {
            const site = await Site.create({
                siteName: siteConfigs[i].name,
                siteNumber: 2000 + i,
                capacity: siteConfigs[i].cap
            });
            sites.push(site);
        }

        // 2. Generate Targets and Actuals
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear];

        for (const site of sites) {
            for (const year of years) {
                console.log(`Generating data for ${site.siteName} (Year ${year})...`);

                // Construct Targets based on Capacity
                // Base formula: Capacity * 4 hours avg sun * 30 days * Seasonality
                const targetValues = {};
                Object.keys(SEASONALITY).forEach(month => {
                    const baseTarget = site.capacity * 4 * 30; // Theoretical monthly max
                    targetValues[month] = Math.round(baseTarget * SEASONALITY[month]);
                });

                const buildGen = await BuildGeneration.create({
                    site: site._id,
                    year: year,
                    ...targetValues
                });

                // Generate Daily Generation logs for 2025 up to today
                if (year === 2025) {
                    const logs = [];
                    const startDate = new Date(2025, 0, 1);
                    const endDate = new Date(); // To today
                    endDate.setHours(0, 0, 0, 0);

                    let currentDate = new Date(startDate);
                    while (currentDate <= endDate) {
                        const monthIndex = currentDate.getMonth();
                        const yearNum = currentDate.getFullYear();
                        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                        const monthKey = monthKeys[monthIndex];

                        // Get the Daily Target for this month
                        const monthlyTarget = targetValues[monthKey];
                        const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
                        const dailyTarget = monthlyTarget / daysInMonth;

                        // Add "Dynamic Weather" - random 20% fluctuation + occasional 50% cloud drop
                        const weatherVariability = 0.8 + Math.random() * 0.4; // 80% to 120%
                        const randomCloudDrop = Math.random() > 0.9 ? 0.5 : 1.0; // 10% chance of a bad day

                        const actualGen = (dailyTarget * weatherVariability * randomCloudDrop).toFixed(2);

                        logs.push({
                            site: site._id,
                            date: new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())),
                            dailyGeneration: parseFloat(actualGen)
                        });
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    await DailyGeneration.insertMany(logs);
                    console.log(` ✅ Inserted ${logs.length} dynamic logs for ${site.siteName}.`);
                }
            }
        }

        // 3. Generate Sample Alerts for Realism
        console.log('Seeding System Alerts...');
        if (sites.length > 0) {
            await Alert.create([
                {
                    site: sites[0]._id,
                    severity: 'CRITICAL',
                    message: 'Inverter Group B Offline - Zero production detected on sub-meter 04.',
                    type: 'EQUIPMENT'
                },
                {
                    site: sites[0]._id,
                    severity: 'WARNING',
                    message: 'Dust accumulation detected - PR dropped below 80% for 3 consecutive days.',
                    type: 'PERFORMANCE'
                }
            ]);
        }

        console.log('\n🚀 ALL DYNAMIC DATA GENERATED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Dynamic Seeding failed:', err);
        process.exit(1);
    }
};

seed();
