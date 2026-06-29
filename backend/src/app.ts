import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import interviewRoutes from './routes/interview.routes';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rate-limiter.middleware';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/db';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*', // In production, replace with specific domains
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter for all API routes
app.use('/api', apiLimiter);

// Health Check
app.get('/health', async (_req, res) => {
  try {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'DISCONNECTED',
      timestamp: new Date().toISOString(),
    });
  }
});

// Serve static files from the uploads directory
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interview', interviewRoutes);

// Centralized Error Handler (must be registered last)
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    // Verify DB connection on startup
    await prisma.$connect();
    logger.info('🔌 Connected to Neon PostgreSQL Database successfully.');

    app.listen(env.PORT, () => {
      logger.info(`🚀 Server is running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
