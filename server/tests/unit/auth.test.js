const jwt = require('jsonwebtoken');

// Mock the auth module for testing
const mockRequest = (token) => ({
    headers: {
        authorization: token ? `Bearer ${token}` : undefined,
    },
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
    let protect, restrictTo;

    beforeEach(() => {
        jest.resetModules();
        // Reset JWT_SECRET for tests
        process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

        // Import after setting env var
        const authModule = require('../../src/middleware/auth');
        protect = authModule.protect;
        restrictTo = authModule.restrictTo;

        jest.clearAllMocks();
    });

    describe('protect middleware', () => {
        it('should return 401 if no token provided', () => {
            const req = mockRequest(null);
            const res = mockResponse();

            protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Not authorized, no token',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid token', () => {
            const req = mockRequest('invalid-token');
            const res = mockResponse();

            protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Not authorized, token failed',
            });
        });

        it('should call next() for valid token', () => {
            const payload = { id: '123', role: 'ADMIN' };
            const validToken = jwt.sign(payload, process.env.JWT_SECRET);
            const req = mockRequest(validToken);
            const res = mockResponse();

            protect(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user.id).toBe('123');
        });
    });

    describe('restrictTo middleware', () => {
        it('should call next() if user role is allowed', () => {
            const req = { user: { role: 'ADMIN' } };
            const res = mockResponse();
            const middleware = restrictTo('ADMIN', 'OPERATOR');

            middleware(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 403 if user role is not allowed', () => {
            const req = { user: { role: 'VIEWER' } };
            const res = mockResponse();
            const middleware = restrictTo('ADMIN');

            middleware(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Forbidden: Insufficient permissions',
            });
        });
    });
});
