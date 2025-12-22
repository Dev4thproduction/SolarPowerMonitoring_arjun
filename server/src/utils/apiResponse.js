/**
 * Standardized API Error Response Utility
 * Ensures consistent error format across all controllers
 */

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Send standardized success response
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {object} data - Response data
 * @param {string} message - Optional success message
 */
const sendSuccess = (res, statusCode, data, message = null) => {
    const response = {
        status: 'success',
        data
    };
    if (message) response.message = message;
    res.status(statusCode).json(response);
};

/**
 * Send standardized error response
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
const sendError = (res, statusCode, message) => {
    res.status(statusCode).json({
        status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
        message
    });
};

module.exports = {
    ApiError,
    sendSuccess,
    sendError
};
