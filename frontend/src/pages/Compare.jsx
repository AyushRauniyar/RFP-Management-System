import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rfpAPI, proposalAPI } from '../services/api';
import api from '../services/api';

function Compare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [checkingEmails, setCheckingEmails] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [notification, setNotification] = useState(null);
  const [overallRecommendation, setOverallRecommendation] = useState(null);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [expandedConversations, setExpandedConversations] = useState({});
  const [simulatorData, setSimulatorData] = useState({
    proposalId: '',
    emailContent: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  // Auto-refresh data every 30 seconds to catch automatically processed emails
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // Only poll if not currently loading, evaluating, or checking emails
      if (!loading && !evaluating && !checkingEmails) {
        fetchData();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [id, loading, evaluating, checkingEmails]);

  const fetchData = async () => {
    try {
      const [rfpResponse, proposalsResponse, conversationsResponse] = await Promise.all([
        rfpAPI.getById(id),
        proposalAPI.getByRFP(id),
        api.get(`/conversations/${id}`)
      ]);
      setRfp(rfpResponse.data);
      setProposals(proposalsResponse.data);
      setConversations(conversationsResponse.data);
      
      // Load saved overallRecommendation from RFP if it exists
      if (rfpResponse.data.overallRecommendation) {
        setOverallRecommendation(rfpResponse.data.overallRecommendation);
      }
      
      // Auto-select first parsed proposal if available
      const parsed = proposalsResponse.data.filter(p => p.status === 'parsed' || p.status === 'evaluated');
      if (parsed.length > 0 && !selectedVendorId) {
        setSelectedVendorId(parsed[0]._id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load data', err);
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const response = await proposalAPI.evaluate(id);
      setProposals(response.data.proposals);
      setOverallRecommendation(response.data.evaluation?.overallRecommendation || null);
      
      setNotification({
        type: 'success',
        message: '✅ AI Evaluation Complete! See recommendations below.'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.details || 'Failed to evaluate proposals'
      });
      setTimeout(() => setNotification(null), 5000);
    }
    setEvaluating(false);
  };

  const handleCheckEmails = async () => {
    setCheckingEmails(true);
    setNotification({ type: 'info', message: '🔄 Checking for new emails...' });
    
    try {
      const response = await proposalAPI.checkEmails();
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh proposals data
      await fetchData();
      
      // Show success message
      const count = response.data.count || 0;
      if (count > 0) {
        setNotification({ 
          type: 'success', 
          message: `✅ Successfully processed ${count} email(s)! New proposals are now visible below. Accept them and click "Evaluate with AI" when ready.` 
        });
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({ 
          type: 'info', 
          message: '📭 No new emails found from vendors. Proposals will appear automatically when vendors respond.' 
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: `❌ ${err.response?.data?.error || 'Failed to check emails'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    }
    setCheckingEmails(false);
  };

  const handleAcceptConversation = async (conversationId) => {
    try {
      await api.post(`/conversations/${conversationId}/accept`);
      setNotification({ 
        type: 'success', 
        message: '✅ Proposal accepted! Running AI evaluation...' 
      });
      
      // Refresh data first
      await fetchData();
      
      // Auto-trigger AI evaluation after accepting
      setTimeout(() => {
        handleEvaluate();
      }, 1000); // Small delay to ensure data is refreshed
      
    } catch (error) {
      console.error('Error accepting conversation:', error);
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.error || 'Failed to accept proposal' 
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleRejectConversation = async (conversationId) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      await api.post(`/conversations/${conversationId}/reject`, { reason });
      setNotification({ 
        type: 'info', 
        message: '❌ Response rejected' 
      });
      setTimeout(() => setNotification(null), 3000);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting conversation:', error);
      setNotification({ 
        type: 'error', 
        message: 'Failed to reject conversation' 
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const toggleConversationExpand = (conversationId) => {
    setExpandedConversations(prev => ({
      ...prev,
      [conversationId]: !prev[conversationId]
    }));
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    try {
      await proposalAPI.simulateResponse(simulatorData.proposalId, simulatorData.emailContent);
      setShowSimulator(false);
      setSimulatorData({ proposalId: '', emailContent: '' });
      fetchData();
      alert('Vendor response simulated successfully!');
    } catch (err) {
      alert(err.response?.data?.details || 'Failed to simulate response');
    }
  };

  const exampleResponse = `Thank you for the RFP opportunity.

We are pleased to submit our proposal:

Items:
- Laptops: 20 units at $1,200 each = $24,000
- Monitors (27-inch): 15 units at $350 each = $5,250

Total Amount: $29,250

Delivery: We can deliver within 21 days
Payment Terms: Net 30 as requested
Warranty: 2 years comprehensive warranty included

We look forward to working with you.`;

  if (loading) return <div className="loading">Loading...</div>;
  if (!rfp) return <div className="error">RFP not found</div>;

  const parsedProposals = proposals.filter(p => p.status === 'parsed' || p.status === 'evaluated');
  const sentProposals = proposals.filter(p => p.status === 'sent');

  return (
    <div>
      {/* Info banner - FIRST ELEMENT */}
      <div className="info-message" style={{ marginBottom: '0.75rem', padding: '0.85rem 1.1rem' }}>
        <strong style={{ fontSize: '0.925rem' }}>📧 Automatic Email Monitoring Active!</strong>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.875rem', lineHeight: '1.6' }}>
          System checks for vendor responses every 5 minutes. Click "Check Emails" to manually trigger an immediate check. 
          Once proposals are received and you've reviewed them in the "Pending Review" section, accept the ones you want to compare. 
          After accepting proposals, scroll down and click "Evaluate with AI" to get intelligent comparisons and recommendations based on pricing, delivery terms, and overall value.
        </p>
      </div>

      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h1 className="page-title" style={{ marginBottom: '0.4rem' }}>Analyze Proposals</h1>
            <p className="page-description" style={{ marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '500' }}>{rfp.title}</p>
            {rfp.originalPrompt && (
              <div style={{ 
                background: '#f3f4f6', 
                padding: '0.75rem 0.875rem', 
                borderRadius: '6px',
                borderLeft: '3px solid #8b5cf6',
                marginTop: '0.6rem',
                maxWidth: '750px'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.8rem', 
                  color: '#6b7280',
                  fontWeight: '600',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  💬 Original Request
                </p>
                <p style={{ 
                  margin: 0, 
                  color: '#374151',
                  lineHeight: '1.6',
                  fontStyle: 'italic',
                  fontSize: '0.9rem'
                }}>
                  "{rfp.originalPrompt}"
                </p>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCheckEmails}
            disabled={checkingEmails}
            style={{ height: 'fit-content', padding: '0.65rem 1.1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            {checkingEmails ? '🔄 Checking...' : '📧 Check Emails'}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '0.75rem',
            background: notification.type === 'success' ? '#dcfce7' : 
                       notification.type === 'error' ? '#fee2e2' : '#dbeafe',
            borderLeft: `4px solid ${notification.type === 'success' ? '#22c55e' : 
                                     notification.type === 'error' ? '#ef4444' : '#3b82f6'}`,
            padding: '0.75rem 1rem',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <p style={{ 
            margin: 0, 
            color: notification.type === 'success' ? '#166534' : 
                   notification.type === 'error' ? '#991b1b' : '#1e40af',
            fontWeight: '500',
            fontSize: '0.875rem'
          }}>
            {notification.message}
          </p>
        </div>
      )}

      {/* Simulator for testing - only show if there are sent proposals AND no parsed proposals */}
      {sentProposals.length > 0 && parsedProposals.length === 0 && (
        <div className="card" style={{ marginBottom: '0.75rem', background: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '0.85rem 1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '0.4rem', color: '#92400e', fontSize: '1.05rem' }}>⚠️ Testing Mode</h3>
              <p style={{ margin: 0, color: '#78350f', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {sentProposals.length} proposal(s) waiting for vendor responses. You can use the simulator below or wait for automatic email processing.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowSimulator(!showSimulator)}
              style={{ fontSize: '0.9rem', padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}
            >
              {showSimulator ? 'Hide Simulator' : 'Simulate Response'}
            </button>
          </div>

          {showSimulator && (
            <div style={{ marginTop: '0.85rem', background: 'white', padding: '0.85rem', borderRadius: '6px' }}>
              <form onSubmit={handleSimulate}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.9rem' }}>Select Proposal</label>
                  <select
                    className="form-input"
                    value={simulatorData.proposalId}
                    onChange={(e) => setSimulatorData({ ...simulatorData, proposalId: e.target.value })}
                    required
                    style={{ fontSize: '0.9rem' }}
                  >
                    <option value="">Select a vendor...</option>
                    {sentProposals.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.vendorId?.name || 'Unknown Vendor'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.9rem' }}>Vendor Response Email</label>
                  <textarea
                    className="form-textarea"
                    value={simulatorData.emailContent}
                    onChange={(e) => setSimulatorData({ ...simulatorData, emailContent: e.target.value })}
                    placeholder="Paste vendor's email response here..."
                    required
                    style={{ minHeight: '200px', fontSize: '0.875rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSimulatorData({ ...simulatorData, emailContent: exampleResponse })}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem 1rem',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Use Example Response
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                  Simulate & Parse Response
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Show waiting proposals status */}
      {(sentProposals.length > 0 || conversations.filter(c => c.status === 'pending_review' || c.status === 'rejected').length > 0) && (
        <div className="card" style={{ marginBottom: '0.75rem', background: '#fff7ed', borderLeft: '4px solid #f59e0b', padding: '0.85rem 1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '0.4rem', color: '#92400e', fontSize: '1.05rem' }}>⏳ Awaiting Responses</h3>
              <p style={{ margin: 0, color: '#78350f', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {(() => {
                  const pendingOrRejectedVendors = conversations
                    .filter(c => c.status === 'pending_review' || c.status === 'rejected')
                    .map(c => c.vendorId);
                  const notRespondedVendors = sentProposals.filter(p => 
                    !pendingOrRejectedVendors.some(v => v?._id === p.vendorId?._id)
                  );
                  const pendingReviewCount = conversations.filter(c => c.status === 'pending_review').length;
                  const total = notRespondedVendors.length + pendingReviewCount;
                  
                  if (total === 0) return 'All vendors responded and reviewed!';
                  
                  const parts = [];
                  if (notRespondedVendors.length > 0) {
                    parts.push(`${notRespondedVendors.length} vendor(s) haven't responded yet: ${notRespondedVendors.map(p => p.vendorId?.name || 'Unknown').join(', ')}`);
                  }
                  if (pendingReviewCount > 0) {
                    parts.push(`${pendingReviewCount} response(s) pending your review`);
                  }
                  return parts.join(' • ');
                })()}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCheckEmails}
              disabled={checkingEmails}
              style={{ height: 'fit-content', padding: '0.6rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              {checkingEmails ? '🔄 Checking...' : '📧 Check Emails'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Review Section */}
      {conversations.filter(c => c.status === 'pending_review').length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.85rem', color: '#f59e0b', fontSize: '1.3rem' }}>📋 Pending Review ({conversations.filter(c => c.status === 'pending_review').length})</h2>
          {conversations.filter(c => c.status === 'pending_review').map((conversation) => {
            const isExpanded = expandedConversations[conversation._id];
            const parsed = conversation.parsedData || {};
            const itemCount = parsed.items?.length || 0;
            const totalAmount = parsed.totalAmount || 0;

            return (
              <div key={conversation._id} style={{
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '1.15rem',
                marginBottom: '0.85rem',
                background: '#fffbeb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.85rem', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.4rem 0', color: '#92400e', fontSize: '1.15rem' }}>
                      🏢 {conversation.vendorId?.name || 'Unknown Vendor'}
                    </h3>
                    <p style={{ margin: '0.25rem 0', color: '#78350f', fontSize: '0.9rem' }}>
                      📧 {conversation.vendorId?.email}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#78350f', fontSize: '0.9rem' }}>
                      📅 Received: {new Date(conversation.receivedAt).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold', color: '#92400e', fontSize: '0.95rem' }}>
                      💰 Amount: ${totalAmount.toLocaleString()} | 📦 Items: {itemCount}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => toggleConversationExpand(conversation._id)}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isExpanded ? '👁️ Hide Details' : '👁️ View Details'}
                    </button>
                    <button
                      onClick={() => handleAcceptConversation(conversation._id)}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✅ Accept Proposal
                    </button>
                    <button
                      onClick={() => handleRejectConversation(conversation._id)}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div style={{ 
                    borderTop: '1px solid #fbbf24', 
                    paddingTop: '0.85rem',
                    marginTop: '0.85rem'
                  }}>
                    <div style={{ marginBottom: '0.85rem' }}>
                      <p style={{ margin: '0.4rem 0', fontSize: '0.9rem' }}><strong>Delivery Time:</strong> {parsed.deliveryTime}</p>
                      <p style={{ margin: '0.4rem 0', fontSize: '0.9rem' }}><strong>Payment Terms:</strong> {parsed.paymentTerms}</p>
                      <p style={{ margin: '0.4rem 0', fontSize: '0.9rem' }}><strong>Warranty:</strong> {parsed.warranty}</p>
                      {parsed.additionalNotes && (
                        <p style={{ margin: '0.4rem 0', fontSize: '0.9rem' }}><strong>Additional Notes:</strong> {parsed.additionalNotes}</p>
                      )}
                    </div>

                    {/* Items Table */}
                    {parsed.items && parsed.items.length > 0 && (
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Items Breakdown:</strong>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          background: 'white',
                          fontSize: '0.875rem'
                        }}>
                          <thead>
                            <tr style={{ background: '#fef3c7' }}>
                              <th style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'left', fontSize: '0.875rem' }}>Item</th>
                              <th style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.875rem' }}>Qty</th>
                              <th style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.875rem' }}>Unit Price</th>
                              <th style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.875rem' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.items.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.7rem', border: '1px solid #fbbf24', fontSize: '0.9rem' }}>{item.description}</td>
                                <td style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.9rem' }}>{item.quantity}</td>
                                <td style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.9rem' }}>${item.unitPrice?.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.9rem' }}>${item.totalPrice?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}>
                              <td colSpan="3" style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.9rem' }}>
                                Total:
                              </td>
                              <td style={{ padding: '0.7rem', border: '1px solid #fbbf24', textAlign: 'right', fontSize: '0.9rem' }}>
                                ${totalAmount.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {parsedProposals.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
            <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>
              {sentProposals.length > 0 ? 'No Responses Received Yet' : 'No Proposals Yet'}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {sentProposals.length > 0 
                ? 'Proposals will appear here automatically when vendors respond via email.'
                : 'Send RFPs to vendors to start receiving proposals.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Action Buttons */}
          <div className="card" style={{ marginBottom: '0.75rem', padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', marginBottom: '0.3rem' }}>Actions</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                  {parsedProposals.length} proposal(s) ready
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowComparisonTable(!showComparisonTable)}
                  style={{ 
                    background: showComparisonTable ? '#4F46E5' : '#6b7280',
                    color: 'white',
                    padding: '0.65rem 1.1rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {showComparisonTable ? '📋 Hide Comparison Table' : '📊 Show Comparison Table'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  style={{ 
                    padding: '0.65rem 1.1rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {evaluating ? '🔄 Evaluating...' : '🤖 Evaluate AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Comparison Table - NEW FEATURE */}
          {showComparisonTable && parsedProposals.length > 0 && (
            <div className="card" style={{ marginBottom: '0.75rem', overflow: 'auto', padding: '1.1rem' }}>
              <h3 style={{ marginBottom: '0.85rem', fontSize: '1.15rem' }}>📊 Quick Comparison</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                      <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Vendor</th>
                      <th style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.875rem' }}>Total Price</th>
                      <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Delivery</th>
                      <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Payment</th>
                      <th style={{ padding: '0.7rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.875rem' }}>Warranty</th>
                      {parsedProposals.some(p => p.aiEvaluation?.score) && (
                        <th style={{ padding: '0.7rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>AI Score</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProposals.map((proposal, idx) => (
                      <tr key={proposal._id} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        background: idx % 2 === 0 ? 'white' : '#f9fafb'
                      }}>
                        <td style={{ padding: '0.7rem' }}>
                          <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '0.9rem' }}>
                            {proposal.vendorId?.name || 'Unknown Vendor'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {proposal.vendorId?.email}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '0.7rem', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          color: '#059669'
                        }}>
                          ${proposal.parsedData?.totalAmount?.toLocaleString() || 'N/A'}
                        </td>
                        <td style={{ padding: '0.7rem', color: '#374151', fontSize: '0.875rem' }}>
                          {proposal.parsedData?.deliveryTime || 'Not specified'}
                        </td>
                        <td style={{ padding: '0.7rem', color: '#374151', fontSize: '0.875rem' }}>
                          {proposal.parsedData?.paymentTerms || 'Not specified'}
                        </td>
                        <td style={{ padding: '0.7rem', color: '#374151', fontSize: '0.875rem' }}>
                          {proposal.parsedData?.warranty || 'Not specified'}
                        </td>
                        {parsedProposals.some(p => p.aiEvaluation?.score) && (
                          <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                            {proposal.aiEvaluation?.score ? (
                              <span style={{
                                background: proposal.aiEvaluation.score >= 80 ? '#dcfce7' : 
                                           proposal.aiEvaluation.score >= 60 ? '#fef3c7' : '#fee2e2',
                                color: proposal.aiEvaluation.score >= 80 ? '#166534' : 
                                       proposal.aiEvaluation.score >= 60 ? '#92400e' : '#991b1b',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                fontSize: '0.875rem'
                              }}>
                                {proposal.aiEvaluation.score}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ 
                marginTop: '0.85rem', 
                padding: '0.7rem', 
                background: '#f0f9ff', 
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#0369a1'
              }}>
                💡 <strong>Tip:</strong> Scroll down for detailed proposals with AI analysis.
              </div>
            </div>
          )}

          {/* Overall AI Recommendation - Answers "Which vendor should I go with, and why?" */}
          {overallRecommendation && (
            <div className="card" style={{ 
              marginBottom: '0.75rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderLeft: '4px solid #fbbf24',
              padding: '1.15rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem' }}>
                <div style={{ fontSize: '2.75rem' }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    margin: '0 0 0.6rem 0', 
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 'bold'
                  }}>
                    AI Recommendation: Which Vendor Should You Choose?
                  </h2>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    lineHeight: '1.65',
                    color: 'rgba(255, 255, 255, 0.95)'
                  }}>
                    {overallRecommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Selector Dropdown */}
          <div className="card" style={{ marginBottom: '0.75rem', padding: '1.1rem' }}>
            <h3 style={{ marginBottom: '0.85rem', fontSize: '1.15rem' }}>📋 View Individual Proposal</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <label htmlFor="vendorSelect" style={{ fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>
                Select Vendor:
              </label>
              <select
                id="vendorSelect"
                value={selectedVendorId || ''}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.9rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#111827',
                  cursor: 'pointer',
                  minWidth: '240px',
                  fontWeight: '500'
                }}
              >
                <option value="">-- Select a vendor --</option>
                {parsedProposals.map((proposal) => (
                  <option key={proposal._id} value={proposal._id}>
                    {proposal.vendorId?.name || 'Unknown Vendor'} - ${proposal.parsedData?.totalAmount?.toLocaleString() || 'N/A'}
                  </option>
                ))}
              </select>
              {selectedVendorId && (
                <button
                  onClick={() => setSelectedVendorId(null)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.9rem'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {!selectedVendorId && (
              <div style={{ 
                marginTop: '0.85rem', 
                padding: '0.7rem', 
                background: '#f0f9ff', 
                borderRadius: '6px',
                color: '#0369a1',
                fontSize: '0.875rem'
              }}>
                💡 Select a vendor from the dropdown to view their detailed proposal
              </div>
            )}
          </div>

          {/* Individual Proposal Display */}
          {parsedProposals.filter(p => p._id === selectedVendorId).map((proposal) => (
            <div key={proposal._id} className="card" style={{ marginBottom: '0.75rem', padding: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{proposal.vendorId?.name || 'Unknown Vendor'}</h2>
                  <p style={{ color: '#6b7280', margin: '0.2rem 0', fontSize: '0.9rem' }}>{proposal.vendorId?.email}</p>
                  {proposal.receivedAt && (
                    <p style={{ 
                      color: '#059669', 
                      fontSize: '0.875rem',
                      margin: '0.4rem 0 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>✅ Received:</span>
                      <strong>{new Date(proposal.receivedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</strong>
                    </p>
                  )}
                </div>
                {proposal.aiEvaluation?.score && (
                  <div style={{
                    background: proposal.aiEvaluation.score >= 80 ? '#dcfce7' : proposal.aiEvaluation.score >= 60 ? '#fef3c7' : '#fee2e2',
                    color: proposal.aiEvaluation.score >= 80 ? '#166534' : proposal.aiEvaluation.score >= 60 ? '#92400e' : '#991b1b',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    Score: {proposal.aiEvaluation.score}/100
                  </div>
                )}
              </div>

              {/* Section 1: Total Pricing */}
              <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.85rem', borderLeft: '4px solid #22c55e' }}>
                <h3 style={{ marginBottom: '0.4rem', color: '#166534', fontSize: '1.05rem' }}>💰 Total Pricing</h3>
                <p style={{ fontSize: '1.9rem', fontWeight: 'bold', color: '#22c55e', margin: '0.3rem 0' }}>
                  ${proposal.parsedData?.totalAmount?.toLocaleString() || 'N/A'}
                </p>
              </div>

              {/* Section 2: Items Breakdown */}
              {proposal.parsedData?.items && proposal.parsedData.items.length > 0 && (
                <div style={{ background: '#f9fafb', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.85rem', borderLeft: '4px solid #6b7280' }}>
                  <h3 style={{ marginBottom: '0.6rem', color: '#374151', fontSize: '1.05rem' }}>📦 Items Breakdown</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.4rem' }}>
                      <thead>
                        <tr style={{ background: '#e5e7eb' }}>
                          <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '2px solid #d1d5db', fontSize: '0.875rem' }}>Item</th>
                          <th style={{ padding: '0.6rem', textAlign: 'center', borderBottom: '2px solid #d1d5db', fontSize: '0.875rem' }}>Qty</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '2px solid #d1d5db', fontSize: '0.875rem' }}>Unit Price</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '2px solid #d1d5db', fontSize: '0.875rem' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.parsedData.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.7rem', fontWeight: '500', fontSize: '0.9rem' }}>{item.description || item.name || 'Unknown Item'}</td>
                            <td style={{ padding: '0.7rem', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</td>
                            <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.9rem' }}>${item.unitPrice?.toLocaleString()}</td>
                            <td style={{ padding: '0.7rem', textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: '0.9rem' }}>
                              ${item.totalPrice?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Compact Grid for Delivery, Payment, Warranty */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                {/* Section 3: Delivery Time */}
                <div style={{ background: '#fef3c7', padding: '0.85rem', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                  <h3 style={{ marginBottom: '0.4rem', color: '#92400e', fontSize: '0.95rem' }}>📅 Delivery</h3>
                  <p style={{ color: '#78350f', margin: '0.2rem 0', fontSize: '1rem', fontWeight: '500' }}>
                    {proposal.parsedData?.deliveryTime || 'Not specified'}
                  </p>
                </div>

                {/* Section 4: Payment Terms */}
                <div style={{ background: '#dbeafe', padding: '0.85rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                  <h3 style={{ marginBottom: '0.4rem', color: '#1e40af', fontSize: '0.95rem' }}>💳 Payment</h3>
                  <p style={{ color: '#1e3a8a', margin: '0.2rem 0', fontSize: '1rem', fontWeight: '500' }}>
                    {proposal.parsedData?.paymentTerms || 'Not specified'}
                  </p>
                </div>

                {/* Section 5: Warranty */}
                <div style={{ background: '#e0e7ff', padding: '0.85rem', borderRadius: '6px', borderLeft: '4px solid #6366f1' }}>
                  <h3 style={{ marginBottom: '0.4rem', color: '#4338ca', fontSize: '0.95rem' }}>🛡️ Warranty</h3>
                  <p style={{ color: '#3730a3', margin: '0.2rem 0', fontSize: '1rem', fontWeight: '500' }}>
                    {proposal.parsedData?.warranty || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Section 6: Additional Information */}
              <div style={{ background: '#fef2f2', padding: '0.85rem', borderRadius: '6px', marginBottom: '0.85rem', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ marginBottom: '0.4rem', color: '#991b1b', fontSize: '0.95rem' }}>📋 Additional Information</h3>
                <p style={{ color: '#7f1d1d', margin: '0.2rem 0', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {proposal.parsedData?.additionalNotes && proposal.parsedData.additionalNotes.trim() !== '' 
                    ? proposal.parsedData.additionalNotes 
                    : 'No additional information mentioned'}
                </p>
              </div>

              {/* AI Evaluation */}
              {proposal.aiEvaluation && (
                <div style={{ background: '#f0f9ff', padding: '0.85rem', borderRadius: '6px', borderLeft: '4px solid #0284c7' }}>
                  <h3 style={{ marginBottom: '0.6rem', color: '#0284c7', fontSize: '0.95rem' }}>🤖 AI Analysis</h3>
                  
                  {proposal.aiEvaluation.strengths && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <strong style={{ color: '#22c55e', fontSize: '0.9rem' }}>✓ Strengths:</strong>
                      <ul style={{ marginTop: '0.3rem', fontSize: '0.875rem', marginLeft: '1.25rem', lineHeight: '1.6' }}>
                        {proposal.aiEvaluation.strengths.map((strength, idx) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {proposal.aiEvaluation.weaknesses && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>⚠ Weaknesses:</strong>
                      <ul style={{ marginTop: '0.3rem', fontSize: '0.875rem', marginLeft: '1.25rem', lineHeight: '1.6' }}>
                        {proposal.aiEvaluation.weaknesses.map((weakness, idx) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {proposal.aiEvaluation.recommendation && (
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>Recommendation:</strong>
                      <p style={{ marginTop: '0.3rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        {proposal.aiEvaluation.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <button
        className="btn btn-secondary"
        onClick={() => navigate('/')}
        style={{ marginTop: '1rem' }}
      >
        Back to Dashboard
      </button>

      {/* AI Evaluation Loading Modal */}
      {evaluating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '2.5rem',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            minWidth: '320px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#111827',
              fontSize: '1.5rem',
              fontWeight: '700'
            }}>
              🤖 AI is Evaluating
            </h3>
            <p style={{ 
              margin: 0, 
              color: '#6b7280',
              fontSize: '1rem',
              lineHeight: '1.5'
            }}>
              Analyzing proposals and calculating scores...<br/>
              This may take a few moments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compare;
