const jwt = require('jsonwebtoken');

// Validate JWT_SECRET at startup (skip in test environment)
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
    process.exit(1);
}

exports.protect = (req, res, next) => {
    // Mock user for bypass
    req.user = { id: 'mock-123', role: 'ADMIN' };
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // Always call next() for bypass
        next();
    };
};
