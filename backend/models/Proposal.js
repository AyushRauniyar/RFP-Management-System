import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  rfpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFP',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'received', 'parsed', 'evaluated'],
    default: 'sent'
  },
  emailContent: {
    type: String
  },
  parsedData: {
    items: [{
      description: String,  // Changed from 'name' to 'description' for consistency
      name: String,         // Keep for backward compatibility
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      specifications: mongoose.Schema.Types.Mixed
    }],
    totalAmount: Number,
    deliveryTime: String,
    paymentTerms: String,
    warranty: String,
    additionalNotes: String
  },
  aiEvaluation: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    strengths: [String],
    weaknesses: [String],
    recommendation: String
  },
  receivedAt: Date,
  parsedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index: One proposal per (RFP + Vendor) combination
// This allows same vendor to have multiple proposals for different RFPs
proposalSchema.index({ rfpId: 1, vendorId: 1 }, { unique: true });

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;
