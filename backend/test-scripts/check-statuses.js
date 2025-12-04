import mongoose from 'mongoose';
import RFP from './models/RFP.js';
import dotenv from 'dotenv';

dotenv.config();

const checkStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const rfps = await RFP.find({});
    console.log(`\n📊 Total RFPs: ${rfps.length}\n`);

    // Group by status
    const statusCount = {};
    rfps.forEach(rfp => {
      const status = rfp.status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
      console.log(`${rfp._id} - "${rfp.title}" - Status: "${rfp.status}"`);
    });

    console.log('\n📈 Status Summary:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkStatuses();
