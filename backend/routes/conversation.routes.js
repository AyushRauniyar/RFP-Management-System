import express from 'express';
import Conversation from '../models/Conversation.js';
import Proposal from '../models/Proposal.js';
import RFP from '../models/RFP.js';

const router = express.Router();

/**
 * GET /api/conversations/:rfpId
 * Get all conversations for a specific RFP
 */
router.get('/:rfpId', async (req, res) => {
  try {
    const { rfpId } = req.params;
    
    const conversations = await Conversation.find({ rfpId })
      .populate('vendorId')
      .sort({ receivedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * POST /api/conversations/:conversationId/accept
 * Accept a conversation and convert it to a proposal
 */
router.post('/:conversationId/accept', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status === 'accepted') {
      return res.status(400).json({ error: 'Conversation already accepted' });
    }

    // Find existing proposal (any status) for this RFP and vendor
    let proposal = await Proposal.findOne({
      rfpId: conversation.rfpId,
      vendorId: conversation.vendorId
    });

    // Ensure items have both 'description' and 'name' fields for compatibility
    const parsedData = {
      ...conversation.parsedData,
      items: conversation.parsedData.items.map(item => ({
        ...item,
        description: item.description || item.name,
        name: item.name || item.description  // For backward compatibility
      }))
    };

    if (proposal) {
      // Update existing proposal with new data (this is a revised proposal)
      console.log(`📝 Updating existing proposal for vendor ${conversation.vendorId}`);
      proposal.status = 'parsed';
      proposal.emailContent = conversation.emailContent;
      proposal.parsedData = parsedData;
      proposal.receivedAt = conversation.receivedAt;
      proposal.parsedAt = conversation.parsedAt;
      
      // Reset evaluation data since this is a revised proposal
      proposal.evaluation = null;
      proposal.aiScore = null;
    } else {
      // Create new proposal
      console.log(`✨ Creating new proposal for vendor ${conversation.vendorId}`);
      proposal = new Proposal({
        rfpId: conversation.rfpId,
        vendorId: conversation.vendorId,
        status: 'parsed',
        emailContent: conversation.emailContent,
        parsedData: parsedData,
        receivedAt: conversation.receivedAt,
        parsedAt: conversation.parsedAt
      });
    }

    await proposal.save();

    // Update conversation status
    conversation.status = 'accepted';
    conversation.reviewedAt = new Date();
    await conversation.save();

    console.log(`✅ Conversation ${conversationId} accepted and converted to proposal`);

    res.json({
      message: 'Conversation accepted and converted to proposal',
      conversation,
      proposal
    });
  } catch (error) {
    console.error('Error accepting conversation:', error);
    res.status(500).json({ error: 'Failed to accept conversation' });
  }
});

/**
 * POST /api/conversations/:conversationId/reject
 * Reject a conversation
 */
router.post('/:conversationId/reject', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'rejected';
    conversation.rejectionReason = reason || 'Not a valid proposal';
    conversation.reviewedAt = new Date();
    await conversation.save();

    console.log(`❌ Conversation ${conversationId} rejected`);

    res.json({
      message: 'Conversation rejected',
      conversation
    });
  } catch (error) {
    console.error('Error rejecting conversation:', error);
    res.status(500).json({ error: 'Failed to reject conversation' });
  }
});

/**
 * GET /api/conversations/:rfpId/stats
 * Get conversation statistics for an RFP
 */
router.get('/:rfpId/stats', async (req, res) => {
  try {
    const { rfpId } = req.params;
    
    const total = await Conversation.countDocuments({ rfpId });
    const pendingReview = await Conversation.countDocuments({ rfpId, status: 'pending_review' });
    const accepted = await Conversation.countDocuments({ rfpId, status: 'accepted' });
    const rejected = await Conversation.countDocuments({ rfpId, status: 'rejected' });

    res.json({
      total,
      pendingReview,
      accepted,
      rejected
    });
  } catch (error) {
    console.error('Error fetching conversation stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
