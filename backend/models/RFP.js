import mongoose from 'mongoose';

const rfpSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  originalPrompt: {
    type: String,
    default: null
  },
  requirements: {
    items: [{
      name: String,
      quantity: Number,
      specifications: mongoose.Schema.Types.Mixed
    }],
    budget: Number,
    deliveryDeadline: Date,
    paymentTerms: String,
    warranty: String
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'responses_received', 'evaluated', 'completed'],
    default: 'draft'
  },
  sentTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  }],
  overallRecommendation: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
rfpSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const RFP = mongoose.model('RFP', rfpSchema);

export default RFP;
