import mongoose from 'mongoose';
import RFP from './models/RFP.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all RFPs with status 'completed' to 'evaluated'
    const result = await RFP.updateMany(
      { status: 'completed' },
      { $set: { status: 'evaluated' } }
    );

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Updated ${result.modifiedCount} RFP(s) from 'completed' to 'evaluated'`);
    console.log(`   - Matched ${result.matchedCount} RFP(s) with 'completed' status\n`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateStatuses();
