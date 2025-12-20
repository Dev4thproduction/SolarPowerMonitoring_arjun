const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyGenerationSchema = new Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: {
        type: Date,
        required: true,
        // Ensure date is stored as YYYY-MM-DD (00:00:00 time)
        set: (d) => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date;
        }
    },
    dailyGeneration: { type: Number, required: true }
});

module.exports = mongoose.model('DailyGeneration', dailyGenerationSchema);
