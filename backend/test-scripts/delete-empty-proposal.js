import mongoose from 'mongoose';
import Proposal from './models/Proposal.js';
import dotenv from 'dotenv';

dotenv.config();

async function deleteEmptyProposal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const proposalId = '692f31b679e83bde4c0cb508';
    await Proposal.findByIdAndDelete(proposalId);
    
    console.log(`✅ Deleted empty proposal ${proposalId}`);
    console.log('Now the email will be processed fresh when you click "Check Emails Now"');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteEmptyProposal();
