import mongoose from 'mongoose';
import Proposal from './models/Proposal.js';
import dotenv from 'dotenv';

dotenv.config();

async function deleteProposal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Delete the proposal with 5 items but no total
    const result = await Proposal.deleteOne({ 
      rfpId: '692f38901cf8dbcf475a0785',
      status: 'parsed'
    });
    
    console.log(`✅ Deleted ${result.deletedCount} proposal(s)`);
    console.log('Now the email will be reprocessed with improved parsing logic');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteProposal();
