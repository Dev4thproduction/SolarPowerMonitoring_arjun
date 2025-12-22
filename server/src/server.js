const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv-safe').config(); // Enforces .env variables

const routes = require('./routes'); // Import routes
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate Limiting Configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security & Utility Middleware
app.use(helmet());
app.use(cors());
app.use(compression()); // Compress all responses
app.use(express.json());
app.use('/api', limiter); // Apply rate limiting to API routes

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

// Database Connection with Retry Logic
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        console.log('Retrying connection in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return connectDB(); // Retry recursively
    }
};

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Solar Power Meter Backend is running');
});

// Start Server after DB connects
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();

