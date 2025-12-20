const mongoose = require('mongoose');
const { Schema } = mongoose;

const monthlyGenerationSchema = new Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 0, max: 11 }, // 0 = Jan, 11 = Dec
    totalGeneration: { type: Number, required: true },
    targetGeneration: { type: Number, default: 0 },
    performanceRatio: { type: Number, default: 0 },
    peakGeneration: { type: Number, default: 0 },
    avgDailyGeneration: { type: Number, default: 0 },
    daysOperational: { type: Number, default: 0 },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Ensure one record per site per month per year
monthlyGenerationSchema.index({ site: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyGeneration', monthlyGenerationSchema);
