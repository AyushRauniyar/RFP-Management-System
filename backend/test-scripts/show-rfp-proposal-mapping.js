import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RFP from './models/RFP.js';
import Proposal from './models/Proposal.js';
import Vendor from './models/Vendor.js';

dotenv.config();

async function showMapping() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const rfps = await RFP.find().populate('sentTo');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RFP-to-Proposal Mapping (Shows Multiple RFPs per Vendor)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const rfp of rfps) {
      console.log(`📋 RFP: ${rfp.title}`);
      console.log(`   ID: ${rfp._id}`);
      console.log(`   Status: ${rfp.status}`);
      console.log(`   Sent to: ${rfp.sentTo.length} vendor(s)\n`);

      // Get all proposals for this RFP
      const proposals = await Proposal.find({ rfpId: rfp._id })
        .populate('vendorId')
        .sort({ createdAt: -1 });

      if (proposals.length === 0) {
        console.log('   ⚠️  No proposals yet\n');
      } else {
        proposals.forEach((proposal, index) => {
          console.log(`   ${index + 1}. Vendor: ${proposal.vendorId?.name || 'Unknown'}`);
          console.log(`      Email: ${proposal.vendorId?.email}`);
          console.log(`      Proposal Status: ${proposal.status}`);
          console.log(`      Total Amount: ${proposal.parsedData?.totalAmount ? '$' + proposal.parsedData.totalAmount : 'N/A'}`);
          console.log(`      Items: ${proposal.parsedData?.items?.length || 0}`);
          console.log(`      Created: ${proposal.createdAt.toLocaleString()}`);
          console.log('');
        });
      }
      console.log('───────────────────────────────────────────────────────────────\n');
    }

    // Show vendors with multiple proposals
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('👥 Vendors with Multiple Proposals (Across Different RFPs)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const vendors = await Vendor.find();
    for (const vendor of vendors) {
      const vendorProposals = await Proposal.find({ vendorId: vendor._id })
        .populate('rfpId')
        .sort({ createdAt: -1 });

      if (vendorProposals.length > 0) {
        console.log(`🏢 ${vendor.name} (${vendor.email})`);
        console.log(`   Total Proposals: ${vendorProposals.length}\n`);

        vendorProposals.forEach((proposal, index) => {
          console.log(`   ${index + 1}. For RFP: ${proposal.rfpId?.title || 'Unknown'}`);
          console.log(`      RFP ID: ${proposal.rfpId?._id}`);
          console.log(`      Status: ${proposal.status}`);
          console.log(`      Total: ${proposal.parsedData?.totalAmount ? '$' + proposal.parsedData.totalAmount : 'N/A'}`);
          console.log('');
        });
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 Key Points:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Each proposal is uniquely identified by (rfpId + vendorId)');
    console.log('✅ Same vendor CAN have multiple proposals for different RFPs');
    console.log('✅ Same RFP CAN have multiple proposals from different vendors');
    console.log('✅ Compare page filters proposals by specific RFP ID');
    console.log('✅ Compound unique index prevents duplicate proposals per (RFP+Vendor)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showMapping();
