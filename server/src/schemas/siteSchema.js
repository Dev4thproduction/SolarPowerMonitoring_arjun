const { z } = require('zod');

const createSiteSchema = z.object({
    body: z.object({
        siteName: z.string().min(1, 'Site Name is required'),
        siteNumber: z.number({ required_error: 'Site Number is required' }),
        capacity: z.number({ required_error: 'Capacity is required' }).positive('Capacity must be positive')
    })
});

const updateSiteSchema = z.object({
    body: z.object({
        siteName: z.string().optional(),
        siteNumber: z.number().optional(),
        capacity: z.number().positive().optional()
    })
});

module.exports = { createSiteSchema, updateSiteSchema };
