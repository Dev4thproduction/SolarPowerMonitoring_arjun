const mongoose = require('mongoose');
const { Schema } = mongoose;

const siteSchema = new Schema({
    siteName: { type: String, required: true },
    siteNumber: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true }
});

// Ensure unique site numbers
siteSchema.index({ siteNumber: 1 }, { unique: true });

module.exports = mongoose.model('Site', siteSchema);

