/**
 * Main Backend Server Entry Point
 * Project Raah-Sugam - AI-Powered Adaptive Traffic Control
 * 
 * Express.js server with TypeScript, Socket.IO, PostgreSQL, and comprehensive middleware.
 * Provides REST APIs and real-time WebSocket communication for traffic control system.
 * 
 * Author: Raah-Sugam Team
 * License: MIT
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/database';
import { setupWebSocket } from './config/websocket';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { logger } from './utils/logger';
import { metricsRegistry, httpMetrics } from './utils/metrics';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for ingest endpoints
const ingestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow high frequency for real-time data
  message: {
    error: 'Rate limit exceeded for data ingestion',
    retryAfter: '1 minute'
  },
  skip: (req) => {
    // Skip rate limiting for authenticated edge devices
    return req.headers.authorization?.startsWith('Bearer ') || false;
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { service: 'http' });
    }
  }
}));

// Apply rate limiting
app.use(globalLimiter);
app.use('/api/v1/ingest', ingestLimiter);

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpMetrics.httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration / 1000);
    
    httpMetrics.httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// Request correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] as string || 
                     `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Health check endpoints
app.get('/healthz', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        websocket: io.engine.clientsCount > 0 ? 'active' : 'idle'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

app.get('/readyz', async (req, res) => {
  try {
    // More comprehensive readiness check
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if required environment variables are set
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({ error: 'Metrics collection failed' });
  }
});

// Setup application routes
setupRoutes(app);

// Setup WebSocket handlers
setupWebSocket(io);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close Socket.IO server
    io.close(() => {
      logger.info('Socket.IO server closed');
    });
    
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Perform graceful shutdown
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', {
    reason,
    promise
  });
  
  // Perform graceful shutdown
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info('🚦 Raah-Sugam Backend Server Started');
  logger.info('   AI-Powered Adaptive Traffic Control');
  logger.info('='.repeat(60));
  logger.info(`🌐 Server running on port ${PORT}`);
  logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  logger.info(`🏥 Health check at http://localhost:${PORT}/healthz`);
  logger.info(`🔌 WebSocket server ready`);
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('='.repeat(60));
});

// Export for testing
export { app, server, io, prisma };