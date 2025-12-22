const { sendSuccess, sendError, ApiError } = require('../../src/utils/apiResponse');

describe('API Response Utilities', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('sendSuccess', () => {
        it('should send success response with data', () => {
            const testData = { id: 1, name: 'Test Site' };

            sendSuccess(mockRes, 200, testData);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: testData,
            });
        });

        it('should include message when provided', () => {
            const testData = { id: 1 };

            sendSuccess(mockRes, 201, testData, 'Created successfully');

            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: testData,
                message: 'Created successfully',
            });
        });
    });

    describe('sendError', () => {
        it('should send fail status for 4xx errors', () => {
            sendError(mockRes, 400, 'Bad request');

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Bad request',
            });
        });

        it('should send error status for 5xx errors', () => {
            sendError(mockRes, 500, 'Internal server error');

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });
        });
    });

    describe('ApiError class', () => {
        it('should create error with statusCode and message', () => {
            const error = new ApiError(404, 'Not found');

            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Not found');
            expect(error.status).toBe('fail');
            expect(error.isOperational).toBe(true);
        });

        it('should set status to error for 5xx codes', () => {
            const error = new ApiError(500, 'Server error');

            expect(error.status).toBe('error');
        });
    });
});
