import mongoose from 'mongoose';

export async function connectToDatabase(mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    dbName: undefined,
  });
}

export function disconnectFromDatabase() {
  return mongoose.disconnect();
}

