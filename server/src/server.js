const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv-safe').config(); // Enforces .env variables

const { Site, BuildGeneration, DailyGeneration } = require('./models');
const routes = require('./routes'); // Import routes
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Utility Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

// Database Connection with Retry Logic
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Retry after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Solar Power Meter Backend is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
