import express, { Express } from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swaggerConfig.js';
import userRoutes from "./routes/user.js";
import smtpRoutes from "./routes/smtp.js";
import emailRoutes from "./routes/sendEmail.js";
import segmentRoutes from "./routes/segment.js";
import subscriberRoutes from "./routes/subscriber.js";

import dotenv from 'dotenv';
dotenv.config();

const app: Express = express();

const PORT: number = Number(process.env.PORT) || 3210;
const URL: string = process.env.BACKEND_URL || `http://localhost:${PORT}`;


app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3000/', '*'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());
app.use('/api/user', userRoutes);
app.use('/api/smtps', smtpRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/', (req, res) => {
    res.send('welcome to base app');
});

const uri = process.env.MONGODB_URI || `mongodb://localhost:27017/ProjectInit`;

const startServer = async () => {
    try {
        await mongoose.connect(uri);
        console.log('Database connected successfully');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on ${URL}`);
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

startServer();

export default app;