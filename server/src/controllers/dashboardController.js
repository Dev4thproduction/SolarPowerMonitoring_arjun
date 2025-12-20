const { BuildGeneration, DailyGeneration, Site } = require('../models');
const mongoose = require('mongoose');

exports.getDashboardData = async (req, res) => {
    try {
        const { siteId, year, startDate: qStart, endDate: qEnd } = req.query;

        if (!siteId) {
            return res.status(400).json({ status: 'error', message: 'siteId is required' });
        }

        let result = [];
        let aggregationRange = {};

        // 1. Determine View Mode: Year or Specific Range
        if (qStart && qEnd) {
            // RANGE MODE
            const start = new Date(qStart);
            const end = new Date(qEnd);
            end.setHours(23, 59, 59, 999);

            // Fetch all Daily Generation in range
            const dailyData = await DailyGeneration.find({
                site: siteId,
                date: { $gte: start, $lte: end }
            }).sort({ date: 1 });

            // Fetch Targets for all years involved in the range
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();
            const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

            // Check targets for both years to cover fiscal transitions
            const allTargets = await BuildGeneration.find({
                site: siteId,
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
            const targets = await BuildGeneration.findOne({ site: siteId, year: yearNum });
            const startDate = new Date(yearNum, 3, 1);
            const endDate = new Date(yearNum + 1, 3, 1);

            const aggregation = await DailyGeneration.aggregate([
                {
                    $match: {
                        site: new mongoose.Types.ObjectId(siteId),
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

        res.json({
            siteId,
            data: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
