import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
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
  emailSubject: {
    type: String,
    required: true
  },
  emailContent: {
    type: String,
    required: true
  },
  parsedData: {
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number
    }],
    totalAmount: Number,
    deliveryTime: String,
    paymentTerms: String,
    warranty: String,
    additionalNotes: String
  },
  status: {
    type: String,
    enum: ['pending_review', 'accepted', 'rejected'],
    default: 'pending_review'
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  parsedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Can be expanded to user reference later
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to ensure one conversation per email
conversationSchema.index({ rfpId: 1, vendorId: 1, receivedAt: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
