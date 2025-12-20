const { MonthlyGeneration, BuildGeneration } = require('../models');

// GET /api/monthly-generation/:siteId
exports.getMonthlyGeneration = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { year } = req.query;

        let query = { site: siteId };
        if (year) query.year = parseInt(year);

        const data = await MonthlyGeneration.find(query).sort({ year: -1, month: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/monthly-generation
exports.addMonthlyGeneration = async (req, res) => {
    try {
        const { site, year, month, totalGeneration, targetGeneration, peakGeneration, avgDailyGeneration, daysOperational, notes } = req.body;

        // Calculate PR if target is provided
        let performanceRatio = 0;
        if (targetGeneration && targetGeneration > 0) {
            performanceRatio = (totalGeneration / targetGeneration) * 100;
        } else {
            // Try to get target from BuildGeneration
            const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const buildGen = await BuildGeneration.findOne({ site, year });
            if (buildGen && buildGen[monthKeys[month]]) {
                const target = buildGen[monthKeys[month]];
                performanceRatio = (totalGeneration / target) * 100;
            }
        }

        // Upsert - update if exists, create if not
        const record = await MonthlyGeneration.findOneAndUpdate(
            { site, year, month },
            {
                site,
                year,
                month,
                totalGeneration,
                targetGeneration: targetGeneration || 0,
                performanceRatio,
                peakGeneration: peakGeneration || 0,
                avgDailyGeneration: avgDailyGeneration || 0,
                daysOperational: daysOperational || 0,
                notes: notes || ''
            },
            { upsert: true, new: true }
        );

        res.status(201).json(record);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT /api/monthly-generation/:id
exports.updateMonthlyGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const record = await MonthlyGeneration.findByIdAndUpdate(id, updates, { new: true });
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.json(record);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE /api/monthly-generation/:id
exports.deleteMonthlyGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await MonthlyGeneration.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.json({ message: 'Record deleted successfully', id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
