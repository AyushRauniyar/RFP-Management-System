import express from 'express';
import Proposal from '../models/Proposal.js';
import RFP from '../models/RFP.js';
import Vendor from '../models/Vendor.js';
import { parseVendorResponse, evaluateProposals } from '../services/ai.service.js';
import { parseInboundEmail } from '../services/email.service.js';
import { checkEmailsNow } from '../services/email-monitor.service.js';

const router = express.Router();

/**
 * GET /api/proposals/rfp/:rfpId
 * Get all proposals for a specific RFP
 */
router.get('/rfp/:rfpId', async (req, res) => {
  try {
    const proposals = await Proposal.find({ rfpId: req.params.rfpId })
      .populate('vendorId')
      .sort({ createdAt: -1 });
    
    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

/**
 * POST /api/proposals/webhook/inbound
 * Webhook endpoint for receiving vendor responses via email
 * This is called by SendGrid Inbound Parse
 */
router.post('/webhook/inbound', async (req, res) => {
  try {
    console.log('📧 Received inbound email webhook');
    
    // Parse the inbound email data from SendGrid
    const emailData = parseInboundEmail(req.body);
    
    // Extract vendor email from the 'from' field
    const vendorEmail = emailData.from;
    
    // Find the vendor by email
    const vendor = await Vendor.findOne({ email: vendorEmail });
    if (!vendor) {
      console.log(`⚠️ Vendor not found for email: ${vendorEmail}`);
      return res.status(200).json({ message: 'Email received but vendor not found' });
    }

    // Find the most recent pending proposal for this vendor
    const proposal = await Proposal.findOne({ 
      vendorId: vendor._id, 
      status: 'sent' 
    }).sort({ createdAt: -1 });

    if (!proposal) {
      console.log(`⚠️ No pending proposal found for vendor: ${vendor.name}`);
      return res.status(200).json({ message: 'Email received but no pending proposal found' });
    }

    // Get the RFP to provide context for parsing
    const rfp = await RFP.findById(proposal.rfpId);

    // Use AI to parse the vendor response
    const parsedData = await parseVendorResponse(emailData.content, rfp.requirements);

    // Update the proposal with parsed data
    proposal.emailContent = emailData.content;
    proposal.parsedData = parsedData;
    proposal.status = 'parsed';
    proposal.receivedAt = emailData.receivedAt;
    proposal.parsedAt = new Date();
    await proposal.save();

    // Update RFP status
    if (rfp.status === 'sent') {
      rfp.status = 'responses_received';
      await rfp.save();
    }

    console.log(`✅ Proposal parsed successfully for vendor: ${vendor.name}`);
    
    res.status(200).json({ 
      message: 'Vendor response processed successfully',
      proposalId: proposal._id
    });
  } catch (error) {
    console.error('Error processing inbound email:', error);
    res.status(500).json({ 
      error: 'Failed to process email', 
      details: error.message 
    });
  }
});

/**
 * POST /api/proposals/simulate-response
 * Simulate receiving a vendor response (for testing without email)
 */
router.post('/simulate-response', async (req, res) => {
  try {
    const { proposalId, emailContent } = req.body;

    if (!proposalId || !emailContent) {
      return res.status(400).json({ error: 'Proposal ID and email content are required' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Get the RFP for context
    const rfp = await RFP.findById(proposal.rfpId);

    // Use AI to parse the vendor response
    const parsedData = await parseVendorResponse(emailContent, rfp.requirements);

    // Update the proposal
    proposal.emailContent = emailContent;
    proposal.parsedData = parsedData;
    proposal.status = 'parsed';
    proposal.receivedAt = new Date();
    proposal.parsedAt = new Date();
    await proposal.save();

    // Update RFP status
    if (rfp.status === 'sent') {
      rfp.status = 'responses_received';
      await rfp.save();
    }

    res.json({
      message: 'Vendor response simulated and parsed successfully',
      proposal
    });
  } catch (error) {
    console.error('Error simulating vendor response:', error);
    res.status(500).json({ 
      error: 'Failed to simulate response', 
      details: error.message 
    });
  }
});

/**
 * POST /api/proposals/evaluate/:rfpId
 * Evaluate all proposals for an RFP using AI
 */
router.post('/evaluate/:rfpId', async (req, res) => {
  try {
    const rfpId = req.params.rfpId;

    // Get RFP
    const rfp = await RFP.findById(rfpId);
    if (!rfp) {
      return res.status(404).json({ error: 'RFP not found' });
    }

    // Get all parsed proposals for this RFP
    const proposals = await Proposal.find({ 
      rfpId, 
      status: { $in: ['parsed', 'evaluated'] }
    }).populate('vendorId');

    if (proposals.length === 0) {
      return res.status(400).json({ error: 'No proposals to evaluate' });
    }

    // Use AI to evaluate proposals
    const evaluation = await evaluateProposals(rfp.requirements, proposals);

    // Update each proposal with its evaluation
    const updatePromises = proposals.map((proposal, index) => {
      const evalData = evaluation.evaluations[index];
      proposal.aiEvaluation = {
        score: evalData.score,
        strengths: evalData.strengths,
        weaknesses: evalData.weaknesses,
        recommendation: evalData.recommendation
      };
      proposal.status = 'evaluated';
      return proposal.save();
    });

    await Promise.all(updatePromises);

    // Save the overall recommendation to the RFP
    rfp.overallRecommendation = evaluation.overallRecommendation || null;

    // Check if all vendors have responded before marking as 'evaluated'
    const totalVendors = rfp.sentTo.length;
    const parsedProposals = await Proposal.countDocuments({ 
      rfpId, 
      status: { $in: ['parsed', 'evaluated'] }
    });

    // Only mark as 'evaluated' if ALL vendors have responded AND evaluation is done
    if (parsedProposals >= totalVendors) {
      rfp.status = 'evaluated';
      console.log(`✅ All ${totalVendors} vendors responded - RFP marked as evaluated`);
    } else {
      // Keep status as 'responses_received' if some vendors haven't responded yet
      console.log(`⏳ Only ${parsedProposals}/${totalVendors} vendors responded - keeping status as 'responses_received'`);
    }
    await rfp.save();

    res.json({
      message: 'Proposals evaluated successfully',
      evaluation,
      proposals: await Proposal.find({ rfpId }).populate('vendorId')
    });
  } catch (error) {
    console.error('Error evaluating proposals:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate proposals', 
      details: error.message 
    });
  }
});

/**
 * GET /api/proposals/:id
 * Get a single proposal by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('vendorId')
      .populate('rfpId');
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

/**
 * POST /api/proposals/check-emails
 * Manually trigger email check (for testing/demo)
 */
router.post('/check-emails', async (req, res) => {
  try {
    console.log('🔍 Manual email check triggered');
    const result = await checkEmailsNow();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Checked emails. Found ${result.count} new email(s)`,
        count: result.count
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error checking emails:', error);
    res.status(500).json({ error: 'Failed to check emails' });
  }
});

export default router;
