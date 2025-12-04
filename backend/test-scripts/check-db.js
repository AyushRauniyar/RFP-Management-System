import mongoose from 'mongoose';
import Proposal from './models/Proposal.js';
import RFP from './models/RFP.js';
import Vendor from './models/Vendor.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all RFPs
    const rfps = await RFP.find({}).populate('sentTo');
    console.log('\n📋 RFPs:', rfps.length);
    rfps.forEach(rfp => {
      console.log(`  - ${rfp.title} (ID: ${rfp._id})`);
      console.log(`    Status: ${rfp.status}`);
      console.log(`    Sent to: ${rfp.sentTo?.map(v => v.email).join(', ') || 'None'}`);
    });

    // Get all Proposals
    const proposals = await Proposal.find({}).populate('vendorId').populate('rfpId');
    console.log('\n📄 Proposals:', proposals.length);
    proposals.forEach(proposal => {
      console.log(`  - From: ${proposal.vendorId?.name || 'Unknown'} (${proposal.vendorId?.email})`);
      console.log(`    RFP: ${proposal.rfpId?.title || 'Unknown'}`);
      console.log(`    Status: ${proposal.status}`);
      console.log(`    Total Amount: $${proposal.parsedData?.totalAmount || 'N/A'}`);
      console.log(`    Items: ${proposal.parsedData?.items?.length || 0}`);
    });

    // Get all Vendors
    const vendors = await Vendor.find({});
    console.log('\n👥 Vendors:', vendors.length);
    vendors.forEach(vendor => {
      console.log(`  - ${vendor.name} (${vendor.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
