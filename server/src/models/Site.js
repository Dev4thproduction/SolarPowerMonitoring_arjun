const mongoose = require('mongoose');
const { Schema } = mongoose;

const siteSchema = new Schema({
    siteName: { type: String, required: true },
    siteNumber: { type: Number, required: true },
    capacity: { type: Number, required: true }
});

module.exports = mongoose.model('Site', siteSchema);
