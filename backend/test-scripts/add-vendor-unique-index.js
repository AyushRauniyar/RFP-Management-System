import mongoose from 'mongoose';
import Vendor from './models/Vendor.js';
import dotenv from 'dotenv';

dotenv.config();

const addUniqueIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for duplicate emails first
    const vendors = await Vendor.find({});
    const emailCount = {};
    const duplicates = [];

    vendors.forEach(vendor => {
      const email = vendor.email.toLowerCase();
      if (emailCount[email]) {
        duplicates.push({ email, ids: [emailCount[email], vendor._id] });
      } else {
        emailCount[email] = vendor._id;
      }
    });

    if (duplicates.length > 0) {
      console.log('\n⚠️  Found duplicate emails:');
      duplicates.forEach(dup => {
        console.log(`   - ${dup.email} (IDs: ${dup.ids.join(', ')})`);
      });
      console.log('\n❌ Please remove duplicate vendors before adding unique index.');
      console.log('   You can delete duplicates manually or use the vendor management UI.\n');
    } else {
      // Create unique index on email field
      await Vendor.collection.createIndex({ email: 1 }, { unique: true });
      console.log('\n✅ Unique index added to email field!');
      console.log('   - Email addresses must now be unique across all vendors');
      console.log('   - Duplicate email entries will be prevented\n');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addUniqueIndex();
