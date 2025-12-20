const { DailyGeneration } = require('../models');

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

        if (existing) {
            existing.dailyGeneration = dailyGeneration;
            await existing.save();
            res.status(200).json(existing);
        } else {
            const newGen = await DailyGeneration.create({ site, date, dailyGeneration });
            res.status(201).json(newGen);
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
