const { BuildGeneration, DailyGeneration, Site } = require('../models');

exports.getDashboardData = async (req, res) => {
    try {
        const { siteId, year } = req.query;

        if (!siteId || !year) {
            return res.status(400).json({ status: 'error', message: 'siteId and year are required' });
        }

        const yearNum = parseInt(year);

        // 1. Fetch BuildGeneration (Targets)
        const targets = await BuildGeneration.findOne({ site: siteId, year: yearNum });

        // 2. Define Financial Year Date Range (Apr 1st Year to Mar 31st Year+1)
        const startDate = new Date(yearNum, 3, 1); // Month is 0-indexed: 3 = April
        const endDate = new Date(yearNum + 1, 3, 1); // Until April 1st next year (exclusive)

        // 3. Aggregate DailyGeneration (Actuals)
        const aggregation = await DailyGeneration.aggregate([
            {
                $match: {
                    site: new (require('mongoose').Types.ObjectId)(siteId),
                    date: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: { $month: "$date" }, // 1-12
                    totalGeneration: { $sum: "$dailyGeneration" }
                }
            }
        ]);

        // Map Mongo month (1-12) to our schema keys and index
        // Mongo 1=Jan, 2=Feb, ..., 12=Dec
        const monthMap = {
            1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may', 6: 'jun',
            7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec'
        };

        // Financial Year Order
        const fyMonths = [
            'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'
        ];

        const result = fyMonths.map(monthKey => {
            // Find actuals for this month
            // Needed to map key 'apr' -> mongo month 4
            const mongoMonth = Object.keys(monthMap).find(key => monthMap[key] === monthKey);
            const actualData = aggregation.find(a => a._id === parseInt(mongoMonth));
            const actual = actualData ? actualData.totalGeneration : 0;

            const target = targets ? targets[monthKey] : 0;

            // PR Calculation: (Actual / Target) * 100
            let pr = 0;
            if (target > 0) {
                pr = (actual / target) * 100;
            }

            // Status Logic
            let status = 'Poor';
            if (pr >= 90) status = 'Excellent';
            else if (pr >= 80) status = 'Good';

            return {
                month: monthKey.toUpperCase(),
                actual,
                target,
                pr: parseFloat(pr.toFixed(2)),
                status
            };
        });

        res.json({
            siteId,
            year: yearNum,
            data: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
