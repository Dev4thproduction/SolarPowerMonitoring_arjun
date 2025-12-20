const { Site } = require('../models');

// GET /api/sites
exports.getAllSites = async (req, res) => {
    try {
        const sites = await Site.find();
        res.json(sites);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/sites
exports.createSite = async (req, res) => {
    const { siteName, siteNumber, capacity } = req.body;
    try {
        const newSite = await Site.create({ siteName, siteNumber, capacity });
        res.status(201).json(newSite);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT /api/sites/:id
exports.updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSite = await Site.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedSite) return res.status(404).json({ message: 'Site not found' });
        res.json(updatedSite);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// DELETE /api/sites/:id
exports.deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSite = await Site.findByIdAndDelete(id);
        if (!deletedSite) return res.status(404).json({ message: 'Site not found' });
        res.json({ message: 'Site deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
