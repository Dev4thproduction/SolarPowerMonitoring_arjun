const { DailyGeneration, BuildGeneration, Alert } = require('../models');

// GET /api/daily-generation/:siteId
exports.getDailyGeneration = async (req, res) => {
    try {
        const { siteId } = req.params;
        const data = await DailyGeneration.find({ site: siteId }).sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/daily-generation
// Expects: { site: ObjectId, date: Date, dailyGeneration: number }
exports.addDailyGeneration = async (req, res) => {
    try {
        const { site, date, dailyGeneration } = req.body;

        // We could check uniqueness for date+site if needed, or just insert
        // Ideally we might want one entry per day per site, so let's try to update if exists
        // But the schema didn't enforce valid uniqueness other than date format. 
        // I'll upsert based on date (YYYY-MM-DD handled by setter/query)

        // Construct a date query that matches the day (00:00:00)
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const existing = await DailyGeneration.findOne({ site, date: checkDate });

        let record;
        if (existing) {
            existing.dailyGeneration = dailyGeneration;
            record = await existing.save();
            res.status(200).json(record);
        } else {
            record = await DailyGeneration.create({ site, date, dailyGeneration });
            res.status(201).json(record);
        }

        // --- ENTERPRISE ALERT TRIGGER ---
        try {
            const entryDate = new Date(date);
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthKey = monthNames[entryDate.getMonth()];
            const year = entryDate.getFullYear();

            const targetRecord = await BuildGeneration.findOne({ site, year });
            if (targetRecord) {
                const monthlyTarget = targetRecord[monthKey] || 0;
                const daysInMonth = new Date(year, entryDate.getMonth() + 1, 0).getDate();
                const dailyTarget = monthlyTarget / daysInMonth;
                const pr = (dailyGeneration / dailyTarget) * 100;

                if (pr < 75) {
                    await Alert.create({
                        site,
                        severity: pr < 50 ? 'CRITICAL' : 'WARNING',
                        message: `Underperformance detected: PR is ${pr.toFixed(1)}% (Target: ${dailyTarget.toFixed(1)} units, Actual: ${dailyGeneration} units).`,
                        type: 'PERFORMANCE'
                    });
                }
            }
        } catch (alertErr) {
            console.error('Failed to trigger alert logic:', alertErr);
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
