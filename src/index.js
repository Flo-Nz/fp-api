import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { port, mongoDbUri } from './config/config.js';
import router from './router.js';
import 'dotenv/config';
import sanitize from 'sanitize';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(sanitize.middleware);

// Define your routes here
app.use('/', router);

// Start function
const start = async () => {
    try {
        await mongoose.connect(mongoDbUri);
        app.listen(port, () => console.log('Server started on port 3000'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

start();
