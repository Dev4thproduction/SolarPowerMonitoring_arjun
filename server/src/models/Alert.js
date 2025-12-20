const mongoose = require('mongoose');
const { Schema } = mongoose;

const alertSchema = new Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    severity: {
        type: String,
        enum: ['CRITICAL', 'WARNING', 'INFO'],
        default: 'WARNING'
    },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    type: { type: String, enum: ['PERFORMANCE', 'EQUIPMENT', 'COMMUNICATION'], default: 'PERFORMANCE' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
