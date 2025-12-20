const mongoose = require('mongoose');
const { Schema } = mongoose;

const buildGenerationSchema = new Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    year: { type: Number, required: true },
    apr: { type: Number, default: 0 },
    may: { type: Number, default: 0 },
    jun: { type: Number, default: 0 },
    jul: { type: Number, default: 0 },
    aug: { type: Number, default: 0 },
    sep: { type: Number, default: 0 },
    oct: { type: Number, default: 0 },
    nov: { type: Number, default: 0 },
    dec: { type: Number, default: 0 },
    jan: { type: Number, default: 0 },
    feb: { type: Number, default: 0 },
    mar: { type: Number, default: 0 }
}, { timestamps: true });

buildGenerationSchema.index({ site: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('BuildGeneration', buildGenerationSchema);
