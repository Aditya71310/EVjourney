import mongoose from 'mongoose';

let mongoConnected = false;

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    console.log(
      '[DB] MONGODB_URI not configured. Running with persistent local JSON store (.data/ev-journey-db.json).'
    );
    mongoConnected = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnected = true;
    console.log('[DB] Connected to MongoDB Atlas via Mongoose.');
    return true;
  } catch (err) {
    console.warn(
      '[DB] MongoDB connection failed, falling back to persistent local JSON store:',
      err instanceof Error ? err.message : err
    );
    mongoConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return mongoConnected && mongoose.connection.readyState === 1;
}
