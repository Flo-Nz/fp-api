import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import router from './router.js';
import dotenv from 'dotenv';
dotenv.config({ override: true });

export const port = process.env.PORT || 3000;

const app = express();

// Rate limiting — 100 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => req.method === 'OPTIONS',
});

// Auth endpoints get stricter limits (20 req/min)
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Stricter rate limiting on auth routes
app.use('/discord/login', authLimiter);
app.use('/google/login', authLimiter);
app.use('/auth/verify-jwt', authLimiter);

// Router
app.use('/', router);

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message, err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

// Start function
const start = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const server = app.listen(port, () =>
            console.log(`Server started on port ${port}`)
        );

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(() => console.log('HTTP server closed'));
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

start();
