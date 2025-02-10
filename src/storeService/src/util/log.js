import pino from 'pino';
import PrismaClientSingleton from './prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Custom function to save logs in DB
export async function logToDatabase(jobId, level, message) {
  await PrismaClientSingleton.getInstance().jobLog.create({
    data: { jobId, level, message }
  });
}


