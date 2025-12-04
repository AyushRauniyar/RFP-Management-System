import mongoose from 'mongoose';
import Proposal from './models/Proposal.js';
import Vendor from './models/Vendor.js';
import RFP from './models/RFP.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkProposals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const rfpId = '692f319979e83bde4c0cb4f1';
    const proposals = await Proposal.find({ rfpId }).populate('vendorId');
    
    console.log(`\n📄 Proposals for RFP ${rfpId}:`, proposals.length);
    proposals.forEach(proposal => {
      console.log('\n' + JSON.stringify(proposal, null, 2));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProposals();
