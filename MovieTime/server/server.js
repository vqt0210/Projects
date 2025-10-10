import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';
import searchRoutes from "./routes/searchRoutes.js"
import actorRoutes from "./routes/actorRoutes.js"
import meRouter from './routes/me.js';



const app = express();
import helmet from 'helmet';
import mongoose from 'mongoose';
app.set('trust proxy', 1);
app.use(helmet());
// Render cung cấp PORT; fallback 10000 cho local
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const allowed = ['https://teasonmike.io.vn', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
// Health check cực nhanh (không đụng DB)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Stripe webhook PHẢI đứng trước body parser
app.post(
  '/api/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhooks
);

// Parsers & middlewares chung
app.use(express.json({ limit: '1mb' }));
app.use('/api/inngest', serve({ client: inngest, functions }));
app.use(clerkMiddleware());

// Routes
app.get('/', (req, res) => res.send('Server is Live!'));
app.use('/api/show', showRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use("/api/search", searchRoutes)
app.use("/api/actors", actorRoutes)
app.use('/api/me', meRouter);
app.use((req, res) => res.status(404).json({ success:false, message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success:false, message: 'Internal server error' });
});
// KHỞI ĐỘNG SERVER NGAY, không chờ DB (tránh 502 vì boot chậm)
const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening at http://${HOST}:${PORT}`);
});

// Khuyến nghị Render cho Node: tăng timeouts để tránh reset
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// Kết nối DB nền + retry
const bootDB = async (retry = 0) => {
  try {
    await connectDB();
    console.log('DB connected');
  } catch (err) {
    console.error('DB connect failed:', err?.message);
    if (retry < 5) {
      const delay = Math.min(1000 * 2 ** retry, 10000);
      console.log(`Retrying DB in ${delay} ms...`);
      setTimeout(() => bootDB(retry + 1), delay);
    }
  }
};
bootDB();

// after bootDB() call and exports (end of file)
const shutdown = async (signal) => {
  try {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    // stop accepting new connections
    server.close(async (err) => {
      if (err) {
        console.error('Error closing server', err);
        process.exit(1);
      }
      // close DB connection (mongoose)
      try {
        await mongoose.disconnect();
        console.log('Mongo disconnected');
      } catch (e) {
        console.error('Error disconnecting mongo', e);
      }
      process.exit(0);
    });

    // if not closed in X ms, force exit
    setTimeout(() => {
      console.warn('Force shutdown');
      process.exit(1);
    }, 30 * 1000);
  } catch (e) {
    console.error('Shutdown error', e);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
