import express from 'express';
import RFP from '../models/RFP.js';
import Vendor from '../models/Vendor.js';
import Proposal from '../models/Proposal.js';
import { parseRFPFromText } from '../services/ai.service.js';
import { sendRFPToVendors } from '../services/email.service.js';

const router = express.Router();

/**
 * POST /api/rfps/create
 * Create a new RFP from natural language
 */
router.post('/create', async (req, res) => {
  try {
    const { naturalLanguageText } = req.body;

    if (!naturalLanguageText) {
      return res.status(400).json({ error: 'Natural language text is required' });
    }

    // Use AI to parse the natural language into structured data
    const parsedData = await parseRFPFromText(naturalLanguageText);

    // Create RFP in database with original prompt
    const rfp = new RFP({
      ...parsedData,
      originalPrompt: naturalLanguageText
    });
    await rfp.save();

    res.status(201).json({
      message: 'RFP created successfully',
      rfp
    });
  } catch (error) {
    console.error('Error creating RFP:', error);
    res.status(500).json({ 
      error: 'Failed to create RFP', 
      details: error.message 
    });
  }
});

/**
 * GET /api/rfps
 * Get all RFPs with proposal statistics and AI recommendations
 */
router.get('/', async (req, res) => {
  try {
    const rfps = await RFP.find().sort({ createdAt: -1 }).populate('sentTo');
    
    // Enhance each RFP with proposal statistics and top recommendation
    const enhancedRfps = await Promise.all(rfps.map(async (rfp) => {
      const rfpObj = rfp.toObject();
      
      // Get proposal counts
      const totalProposals = await Proposal.countDocuments({ rfpId: rfp._id });
      const respondedProposals = await Proposal.countDocuments({ 
        rfpId: rfp._id, 
        status: { $in: ['parsed', 'evaluated'] }
      });
      const pendingProposals = await Proposal.countDocuments({ 
        rfpId: rfp._id, 
        status: 'sent'
      });
      
      // Get top AI-recommended vendor (highest score)
      const topProposal = await Proposal.findOne({ 
        rfpId: rfp._id,
        status: 'evaluated'
      })
      .sort({ 'aiEvaluation.score': -1 })
      .populate('vendorId')
      .limit(1);
      
      rfpObj.proposalStats = {
        total: totalProposals,
        responded: respondedProposals,
        pending: pendingProposals
      };
      
      rfpObj.topRecommendation = topProposal ? {
        vendorName: topProposal.vendorId?.name,
        vendorEmail: topProposal.vendorId?.email,
        score: topProposal.aiEvaluation?.score,
        totalAmount: topProposal.parsedData?.totalAmount
      } : null;
      
      return rfpObj;
    }));
    
    res.json(enhancedRfps);
  } catch (error) {
    console.error('Error fetching RFPs:', error);
    res.status(500).json({ error: 'Failed to fetch RFPs' });
  }
});

/**
 * GET /api/rfps/:id
 * Get a single RFP by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const rfp = await RFP.findById(req.params.id).populate('sentTo');
    
    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }
    
    res.json(rfp);
  } catch (error) {
    console.error('Error fetching RFP:', error);
    res.status(500).json({ error: 'Failed to fetch RFP' });
  }
});

/**
 * POST /api/rfps/:id/send
 * Send RFP to selected vendors
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { vendorIds } = req.body;

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({ error: 'Vendor IDs array is required' });
    }

    // Get RFP
    const rfp = await RFP.findById(req.params.id);
    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    // Get vendors
    const vendors = await Vendor.find({ _id: { $in: vendorIds } });
    if (vendors.length === 0) {
      return res.status(404).json({ error: 'No valid vendors found' });
    }

    // Send emails to vendors
    const emailResults = await sendRFPToVendors(rfp, vendors);

    // Update RFP status and sentTo
    rfp.status = 'sent';
    rfp.sentTo = vendorIds;
    await rfp.save();

    // Create proposal records for each vendor
    const proposalPromises = vendors.map(vendor => {
      const proposal = new Proposal({
        rfpId: rfp._id,
        vendorId: vendor._id,
        status: 'sent'
      });
      return proposal.save();
    });

    await Promise.all(proposalPromises);

    res.json({
      message: 'RFP sent successfully',
      rfp,
      emailResults
    });
  } catch (error) {
    console.error('Error sending RFP:', error);
    res.status(500).json({ 
      error: 'Failed to send RFP', 
      details: error.message 
    });
  }
});

/**
 * DELETE /api/rfps/:id
 * Delete an RFP
 */
router.delete('/:id', async (req, res) => {
  try {
    const rfp = await RFP.findByIdAndDelete(req.params.id);
    
    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }
    
    res.json({ message: 'RFP deleted successfully' });
  } catch (error) {
    console.error('Error deleting RFP:', error);
    res.status(500).json({ error: 'Failed to delete RFP' });
  }
});

export default router;
