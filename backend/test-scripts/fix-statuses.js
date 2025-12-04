import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RFP from './models/RFP.js';
import Proposal from './models/Proposal.js';

dotenv.config();

async function fixStatuses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const rfps = await RFP.find();
    let fixed = 0;
    
    for (const rfp of rfps) {
      const totalVendors = rfp.sentTo.length;
      const parsedProposals = await Proposal.countDocuments({ 
        rfpId: rfp._id, 
        status: { $in: ['parsed', 'evaluated'] }
      });
      
      const shouldBeEvaluated = parsedProposals >= totalVendors;
      const currentlyEvaluated = rfp.status === 'evaluated';
      
      if (shouldBeEvaluated !== currentlyEvaluated) {
        const oldStatus = rfp.status;
        rfp.status = shouldBeEvaluated ? 'evaluated' : 'responses_received';
        await rfp.save();
        
        console.log(`✅ Fixed: ${rfp.title}`);
        console.log(`   ${oldStatus} → ${rfp.status} (${parsedProposals}/${totalVendors} responded)`);
        fixed++;
      }
    }
    
    if (fixed === 0) {
      console.log('✅ All RFP statuses are correct!');
    } else {
      console.log(`\n✅ Fixed ${fixed} RFP status(es)`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStatuses();
