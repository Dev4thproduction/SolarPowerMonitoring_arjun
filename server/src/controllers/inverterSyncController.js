const { DailyGeneration, Site } = require('../models');

/**
 * Controller for Inverter integration
 * Provides endpoints for Inverter system to pull data from SolarPowerMeter
 */

// GET /api/inverter-sync/daily-generation
// Get daily generation data for Inverter system
exports.getDailyGenerationForInverter = async (req, res) => {
    try {
        const { startDate, endDate, siteId, siteName } = req.query;

        let query = {};

        // Filter by site
        if (siteId) {
            query.site = siteId;
        } else if (siteName) {
            // Find site by name
            const site = await Site.findOne({ siteName: { $regex: siteName, $options: 'i' } });
            if (site) {
                query.site = site._id;
            }
        }

        // Filter by date range
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Fetch daily generation records with site details
        const records = await DailyGeneration.find(query)
            .populate('site', 'siteName siteNumber capacity')
            .sort({ date: -1 })
            .lean();

        // Transform data to Inverter-friendly format
        const transformedRecords = records.map(record => ({
            _id: record._id,
            siteName: record.site?.siteName || 'Unknown Site',
            siteNumber: record.site?.siteNumber || 0,
            capacity: record.site?.capacity || 0,
            date: record.date,
            dailyGeneration: record.dailyGeneration,
            status: record.status || 'draft',
            // Format date as DD-MM-YYYY for consistency
            dateFormatted: formatDateToDDMMYYYY(record.date),
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        }));

        res.json({
            total: transformedRecords.length,
            records: transformedRecords,
            fetchedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Inverter sync error:', err);
        res.status(500).json({ message: err.message });
    }
};

// GET /api/inverter-sync/sites
// Get all sites for Inverter system mapping
exports.getSitesForInverter = async (req, res) => {
    try {
        const sites = await Site.find({}).lean();

        const transformedSites = sites.map(site => ({
            _id: site._id,
            siteName: site.siteName,
            siteNumber: site.siteNumber,
            capacity: site.capacity
        }));

        res.json({
            total: transformedSites.length,
            sites: transformedSites
        });
    } catch (err) {
        console.error('Inverter sites fetch error:', err);
        res.status(500).json({ message: err.message });
    }
};

// POST /api/inverter-sync/import
// Import inverter data and correlate with daily generation
exports.importInverterData = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Records array is required' });
        }

        const results = [];
        const errors = [];

        for (const record of records) {
            try {
                const { siteName, date, inverterGeneration, inverterValues } = record;

                // Find site by name
                const site = await Site.findOne({ siteName: { $regex: siteName, $options: 'i' } });

                if (!site) {
                    errors.push({ siteName, date, error: 'Site not found' });
                    continue;
                }

                // Parse date (supports DD-MM-YYYY, YYYY-MM-DD, etc.)
                const parsedDate = parseDate(date);
                if (!parsedDate) {
                    errors.push({ siteName, date, error: 'Invalid date format' });
                    continue;
                }

                // Check if daily generation exists for this date
                const existing = await DailyGeneration.findOne({
                    site: site._id,
                    date: parsedDate
                });

                if (existing) {
                    // Update existing record (optional: can compare with inverterGeneration)
                    results.push({
                        siteName,
                        date,
                        status: 'exists',
                        dailyGeneration: existing.dailyGeneration,
                        inverterGeneration: inverterGeneration || 0
                    });
                } else {
                    // Optionally create new daily generation from inverter data
                    // (This depends on your business logic)
                    results.push({
                        siteName,
                        date,
                        status: 'no_match',
                        inverterGeneration: inverterGeneration || 0
                    });
                }
            } catch (err) {
                errors.push({ record, error: err.message });
            }
        }

        res.json({
            processed: records.length,
            matched: results.filter(r => r.status === 'exists').length,
            unmatched: results.filter(r => r.status === 'no_match').length,
            errors: errors.length,
            results,
            errors
        });
    } catch (err) {
        console.error('Inverter import error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Helper: Format date to DD-MM-YYYY
function formatDateToDDMMYYYY(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// Helper: Parse various date formats to Date object
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Try YYYY-MM-DD format
    let match = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }

    // Try DD-MM-YYYY format
    match = String(dateStr).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }

    // Try parsing as-is
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}
