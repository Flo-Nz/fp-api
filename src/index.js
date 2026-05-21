import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import router from './router.js';
import 'dotenv/config';

export const port = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
