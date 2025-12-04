import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('vendors');

    // Drop the unique index on email
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Dropped unique index on email field');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index does not exist (already dropped or never created)');
      } else {
        throw err;
      }
    }

    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropEmailIndex();
