const { z } = require('zod');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid Site ID"
});

const buildGenerationSchema = z.object({
    body: z.object({
        site: objectId,
        year: z.number().int().min(2000, 'Year must be valid'),
        apr: z.number().default(0),
        may: z.number().default(0),
        jun: z.number().default(0),
        jul: z.number().default(0),
        aug: z.number().default(0),
        sep: z.number().default(0),
        oct: z.number().default(0),
        nov: z.number().default(0),
        dec: z.number().default(0),
        jan: z.number().default(0),
        feb: z.number().default(0),
        mar: z.number().default(0)
    })
});

const dailyGenerationSchema = z.object({
    body: z.object({
        site: objectId,
        date: z.string().or(z.date()).transform((val) => new Date(val)), // Accept string or date
        dailyGeneration: z.number({ required_error: 'Generation value is required' }).nonnegative()
    })
});

module.exports = { buildGenerationSchema, dailyGenerationSchema };
