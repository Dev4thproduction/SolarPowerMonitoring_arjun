/**
 * Jest Test Setup
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.MONGO_URI = 'mongodb://localhost:27017/solarpowermeter_test';
process.env.PORT = '5001';

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
// global.console = {
//     ...console,
//     log: jest.fn(),
//     debug: jest.fn(),
// };
