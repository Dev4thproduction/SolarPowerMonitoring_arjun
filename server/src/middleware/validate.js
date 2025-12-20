const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err) {
        if (err instanceof z.ZodError || err.name === 'ZodError') {
            // Zod Validation Error
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: err.errors
            });
        }
        next(err);
    }
};

module.exports = validate;
