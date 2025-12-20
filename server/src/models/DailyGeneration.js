const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyGenerationSchema = new Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: {
        type: Date,
        required: true,
        // Ensure date is stored as YYYY-MM-DD (00:00:00 time)
        // Ensure date is stored as UTC Midnight
        set: (d) => {
            const date = new Date(d);
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        }
    },
    dailyGeneration: { type: Number, required: true }
}, { timestamps: true });

// Performance Optimization: Compound Index for fast range queries
dailyGenerationSchema.index({ site: 1, date: 1 });

module.exports = mongoose.model('DailyGeneration', dailyGenerationSchema);
