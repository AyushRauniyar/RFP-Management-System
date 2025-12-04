import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RFP from './models/RFP.js';
import Proposal from './models/Proposal.js';

dotenv.config();

async function clearAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete all RFPs
    const rfpResult = await RFP.deleteMany({});
    console.log(`🗑️  Deleted ${rfpResult.deletedCount} RFP(s)`);

    // Delete all Proposals
    const proposalResult = await Proposal.deleteMany({});
    console.log(`🗑️  Deleted ${proposalResult.deletedCount} Proposal(s)`);

    console.log('\n✅ All RFPs and Proposals have been cleared from the database');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllData();
