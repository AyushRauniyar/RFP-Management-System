import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RFP from './models/RFP.js';
import Proposal from './models/Proposal.js';
import Conversation from './models/Conversation.js';
import Vendor from './models/Vendor.js';

dotenv.config();

async function debugStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all RFPs
    const rfps = await RFP.find().populate('sentTo');
    
    for (const rfp of rfps) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 RFP: ${rfp.title} (ID: ${rfp._id})`);
      console.log(`   Status: ${rfp.status}`);
      console.log(`   Sent to ${rfp.sentTo.length} vendors: ${rfp.sentTo.map(v => v.name).join(', ')}`);
      
      // Get proposals for this RFP
      const proposals = await Proposal.find({ rfpId: rfp._id }).populate('vendorId');
      console.log(`\n   📦 PROPOSALS (${proposals.length} total):`);
      proposals.forEach(p => {
        console.log(`      - ${p.vendorId?.name || 'Unknown'}: status="${p.status}" (ID: ${p._id})`);
      });
      
      // Count by status
      const statusCounts = {
        sent: proposals.filter(p => p.status === 'sent').length,
        parsed: proposals.filter(p => p.status === 'parsed').length,
        evaluated: proposals.filter(p => p.status === 'evaluated').length
      };
      console.log(`\n   Status Breakdown:`);
      console.log(`      - Sent (placeholders): ${statusCounts.sent}`);
      console.log(`      - Parsed: ${statusCounts.parsed}`);
      console.log(`      - Evaluated: ${statusCounts.evaluated}`);
      console.log(`      - Total parsed+evaluated: ${statusCounts.parsed + statusCounts.evaluated}`);
      
      // Get conversations for this RFP
      const conversations = await Conversation.find({ rfpId: rfp._id }).populate('vendorId');
      console.log(`\n   💬 CONVERSATIONS (${conversations.length} total):`);
      conversations.forEach(c => {
        console.log(`      - ${c.vendorId?.name || 'Unknown'}: status="${c.status}" (ID: ${c._id})`);
      });
      
      // Status logic check
      const parsedProposalsCount = statusCounts.parsed + statusCounts.evaluated;
      const totalVendors = rfp.sentTo.length;
      console.log(`\n   🔍 STATUS LOGIC CHECK:`);
      console.log(`      - Total vendors sent to: ${totalVendors}`);
      console.log(`      - Parsed+Evaluated proposals: ${parsedProposalsCount}`);
      console.log(`      - Should be 'evaluated'? ${parsedProposalsCount >= totalVendors ? 'YES ✅' : 'NO ⏳'}`);
      console.log(`      - Current status in DB: "${rfp.status}"`);
      
      if ((parsedProposalsCount >= totalVendors && rfp.status !== 'evaluated') ||
          (parsedProposalsCount < totalVendors && rfp.status === 'evaluated')) {
        console.log(`      ⚠️  STATUS MISMATCH DETECTED!`);
      }
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
    await mongoose.connection.close();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugStatus();
