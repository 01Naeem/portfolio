import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);

export async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}