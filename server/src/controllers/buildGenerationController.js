const { BuildGeneration } = require('../models');

// GET /api/build-generation/:siteId
exports.getBuildGeneration = async (req, res) => {
    try {
        const { siteId } = req.params;
        const data = await BuildGeneration.find({ site: siteId });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/build-generation
// Expects: { site: ObjectId, year: Number, ...months }
exports.createOrUpdateBuildGeneration = async (req, res) => {
    try {
        const { site, year, ...months } = req.body;
        // Check if entry exists for this site + year
        let buildGen = await BuildGeneration.findOne({ site, year });

        if (buildGen) {
            // Update existing
            Object.assign(buildGen, months);
            await buildGen.save();
        } else {
            // Create new
            buildGen = await BuildGeneration.create(req.body);
        }
        res.status(200).json(buildGen);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
