const { BuildGeneration, DailyGeneration, Site, Alert } = require('../models');
const mongoose = require('mongoose');

exports.getDashboardData = async (req, res) => {
    try {
        const { siteId, year, startDate: qStart, endDate: qEnd } = req.query;

        if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
            return res.status(400).json({ status: 'error', message: 'Valid siteId is required' });
        }

        const siteObjectId = new mongoose.Types.ObjectId(siteId);
        let result = [];

        // 1. Determine View Mode: Year or Specific Range
        if (qStart && qEnd) {
            // RANGE MODE
            // Parse as UTC Midnight to match DB storage
            const [sy, sm, sd] = qStart.split('-').map(Number);
            const [ey, em, ed] = qEnd.split('-').map(Number);

            const start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
            const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

            // Fetch all Daily Generation in range
            const dailyData = await DailyGeneration.find({
                site: siteObjectId,
                date: { $gte: start, $lte: end }
            }).sort({ date: 1 });


            // Fetch Targets for all years involved in the range
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();
            const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

            // Check targets for both years to cover fiscal transitions
            const allTargets = await BuildGeneration.find({
                site: siteObjectId,
                year: { $in: [startYear, startYear - 1, endYear, endYear - 1] }
            });

            // Map Daily Data to Results
            result = dailyData.map(record => {
                const recDate = new Date(record.date);
                const recYear = recDate.getFullYear();
                const recMonth = recDate.getMonth(); // 0-11

                // Determine which fiscal year record belongs to
                // FY starts April. If month < 3, it belongs to recYear - 1 target.
                const fiscalYear = recMonth < 3 ? recYear - 1 : recYear;
                const targetDoc = allTargets.find(t => t.year === fiscalYear);

                const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const monthKey = monthKeys[recMonth];
                const monthlyTarget = targetDoc ? targetDoc[monthKey] : 0;

                // Calculate Daily Target (Pro-rata)
                const daysInMonth = new Date(recYear, recMonth + 1, 0).getDate();
                const dailyTarget = parseFloat((monthlyTarget / daysInMonth).toFixed(2));

                let pr = 0;
                if (dailyTarget > 0) pr = (record.dailyGeneration / dailyTarget) * 100;

                let status = 'Poor';
                if (pr >= 90) status = 'Excellent';
                else if (pr >= 80) status = 'Good';

                return {
                    label: recDate.toLocaleDateString(),
                    date: record.date,
                    actual: record.dailyGeneration,
                    target: dailyTarget,
                    pr: parseFloat(pr.toFixed(2)),
                    status
                };
            });

        } else if (year) {
            // YEAR MODE (FISCAL YEAR)
            const yearNum = parseInt(year);
            const targets = await BuildGeneration.findOne({ site: siteObjectId, year: yearNum });
            const startDate = new Date(yearNum, 3, 1);
            const endDate = new Date(yearNum + 1, 3, 1);

            const aggregation = await DailyGeneration.aggregate([
                {
                    $match: {
                        site: siteObjectId,
                        date: { $gte: startDate, $lt: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $month: "$date" },
                        totalGeneration: { $sum: "$dailyGeneration" }
                    }
                }
            ]);

            const monthMap = {
                1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may', 6: 'jun',
                7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec'
            };

            const fyMonths = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

            result = fyMonths.map(monthKey => {
                const mongoMonth = Object.keys(monthMap).find(key => monthMap[key] === monthKey);
                const actualData = aggregation.find(a => a._id === parseInt(mongoMonth));
                const actual = actualData ? actualData.totalGeneration : 0;
                const target = targets ? targets[monthKey] : 0;

                let pr = 0;
                if (target > 0) pr = (actual / target) * 100;

                let status = 'Poor';
                if (pr >= 90) status = 'Excellent';
                else if (pr >= 80) status = 'Good';

                return {
                    label: monthKey.toUpperCase(),
                    month: monthKey,
                    actual: parseFloat(actual.toFixed(2)),
                    target: parseFloat(target.toFixed(2)),
                    pr: parseFloat(pr.toFixed(2)),
                    status
                };
            });
        } else {
            return res.status(400).json({ status: 'error', message: 'Either year or date range (startDate/endDate) is required' });
        }

        // 3. GENERATE PREDICTIVE FORECAST (Next 7 Days)
        const forecast = [];
        const today = new Date();
        const seasonality = {
            0: 0.75, 1: 0.9, 2: 1.1, 3: 1.2, 4: 1.25, 5: 0.8,
            6: 0.6, 7: 0.65, 8: 0.9, 9: 1.0, 10: 0.85, 11: 0.8
        };

        for (let i = 1; i <= 7; i++) {
            const forecastDate = new Date(today);
            forecastDate.setDate(today.getDate() + i);
            forecastDate.setHours(0, 0, 0, 0);

            const m = forecastDate.getMonth();
            const y = forecastDate.getFullYear();
            const daysInMonth = new Date(y, m + 1, 0).getDate();

            // Typical yield for a 2000kWp plant (scaling based on dynamic seed logic)
            const dailyTarget = (12000 * (seasonality[m] || 1)) / daysInMonth;

            // Forecast logic: base target * (0.9 to 1.1) to account for slight weather variability
            const predicted = parseFloat((dailyTarget * (0.9 + Math.random() * 0.2)).toFixed(2));

            forecast.push({
                label: forecastDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                date: forecastDate,
                target: parseFloat(dailyTarget.toFixed(2)),
                actual: predicted, // Predicted becomes the 'actual' in forecast view
                isForecast: true
            });
        }

        res.json({
            siteId,
            data: result,
            forecast: forecast
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// --- ALERT MANAGEMENT ---
exports.getActiveAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({ resolved: false })
            .populate('site', 'siteName siteNumber')
            .sort({ createdAt: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await Alert.findByIdAndUpdate(id, { resolved: true }, { new: true });
        res.json(alert);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
