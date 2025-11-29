import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import paymentRoutes from './modules/payment/payment.routes';
import { generalLimiter } from './middlewares/rateLimit.middleware';

const app = express();

// Trust first proxy (required for Render, Heroku, etc.)
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(helmet());
app.use(cookieParser());
app.use(generalLimiter);

app.use('/payments', paymentRoutes);
app.use(express.json());

app.use('/api', routes);

export default app;
