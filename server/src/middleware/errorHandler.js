const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the stack trace for debugging

    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
};

module.exports = errorHandler;
