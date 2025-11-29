import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import paymentRoutes from './modules/payment/payment.routes';
import { errorHandler } from './middlewares/error.middleware';
import { generalLimiter } from './middlewares/rateLimit.middleware';

const app = express();

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

app.use(errorHandler);


export default app;
