import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function clearVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('vendors');

    // Delete all vendors
    const result = await collection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} vendors`);

    // Drop all indexes
    try {
      await collection.dropIndexes();
      console.log('✅ Dropped all indexes');
    } catch (err) {
      console.log('ℹ️  No indexes to drop');
    }

    console.log('✅ Done! Database is clean.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearVendors();
