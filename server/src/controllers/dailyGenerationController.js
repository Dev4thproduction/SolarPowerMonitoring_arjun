const { DailyGeneration, BuildGeneration, Alert } = require('../models');
const { parseFlexibleDate, getMonthKey } = require('../utils/dateUtils');

// GET /api/daily-generation/:siteId
exports.getDailyGeneration = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { startDate, endDate } = req.query;

        let query = { site: siteId };

        // Add date range filter if provided
        if (startDate && endDate) {
            query.date = {
                $gte: parseFlexibleDate(startDate) || new Date(startDate),
                $lte: parseFlexibleDate(endDate) || new Date(endDate)
            };
        }

        const data = await DailyGeneration.find(query).sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/daily-generation/all-sites
exports.getAllDailyGeneration = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = {};

        // Add date range filter if provided
        if (startDate && endDate) {
            query.date = {
                $gte: parseFlexibleDate(startDate) || new Date(startDate),
                $lte: parseFlexibleDate(endDate) || new Date(endDate)
            };
        }

        const data = await DailyGeneration.find(query).sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/daily-generation
// Expects: { site: ObjectId, date: Date, dailyGeneration: number }
exports.addDailyGeneration = async (req, res) => {
    try {
        const { site, date, dailyGeneration, status } = req.body;

        // Construct a date query that matches the day (00:00:00)
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const existing = await DailyGeneration.findOne({ site, date: checkDate });

        let record;
        if (existing) {
            existing.dailyGeneration = dailyGeneration;
            if (status !== undefined) existing.status = status;
            record = await existing.save();
            res.status(200).json(record);
        } else {
            record = await DailyGeneration.create({ site, date, dailyGeneration, status: status || 'draft' });
            res.status(201).json(record);
        }

        // --- ENTERPRISE ALERT TRIGGER ---
        try {
            // CRITICAL FIX: Use parseFlexibleDate to correctly parse DD-MM-YYYY format
            // Otherwise "15-07-2024" might be parsed incorrectly (July becomes Jan, etc.)
            const entryDate = parseFlexibleDate(date) || record.date;
            const monthKey = getMonthKey(entryDate);
            const year = entryDate.getUTCFullYear();

            const targetRecord = await BuildGeneration.findOne({ site, year });
            if (targetRecord) {
                const monthlyTarget = targetRecord[monthKey] || 0;
                const monthIndex = entryDate.getUTCMonth(); // 0-11
                const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
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

// PUT /api/daily-generation/:id
// Update an existing daily generation record
exports.updateDailyGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const { dailyGeneration, date, status } = req.body;

        const record = await DailyGeneration.findById(id);
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        if (dailyGeneration !== undefined) record.dailyGeneration = dailyGeneration;
        if (date !== undefined) record.date = date;
        if (status !== undefined) record.status = status;

        await record.save();
        res.json(record);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE /api/daily-generation/:id
// Delete a daily generation record
exports.deleteDailyGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await DailyGeneration.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.json({ message: 'Record deleted successfully', id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/daily-generation/bulk-import
// Bulk import daily generation records for fast insertion
// Expects: { site: ObjectId, records: [{ date: Date, dailyGeneration: number }] }
exports.bulkImportDailyGeneration = async (req, res) => {
    try {
        const { site, records } = req.body;

        if (!site || !records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Invalid input. Requires site and records array.' });
        }

        // Prepare bulk operations using upsert (update or insert)
        const bulkOps = records.map(record => {
            // CRITICAL FIX: Use parseFlexibleDate to correctly parse DD-MM-YYYY format
            const checkDate = parseFlexibleDate(record.date) || new Date(record.date);

            return {
                updateOne: {
                    filter: { site, date: checkDate },
                    update: {
                        $set: {
                            site,
                            date: checkDate,
                            dailyGeneration: record.dailyGeneration,
                            status: record.status || 'draft'
                        }
                    },
                    upsert: true
                }
            };
        });

        // Execute bulk write for maximum speed
        const result = await DailyGeneration.bulkWrite(bulkOps, { ordered: false });

        res.status(200).json({
            message: 'Bulk import completed',
            matched: result.matchedCount,
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
            total: records.length
        });
    } catch (err) {
        console.error('Bulk import error:', err);
        res.status(500).json({ message: err.message });
    }
};
