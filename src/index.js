import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import router from './router.js';
import 'dotenv/config';
import sanitize from 'sanitize';

export const port = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(sanitize.middleware);

// Router
app.use('/', router);

// Start function
const start = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        app.listen(port, () => console.log('Server started on port 3000'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

start();
