import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ConversationReview = () => {
  const { rfpId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [rfp, setRfp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    fetchData();
  }, [rfpId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rfpRes, conversationsRes] = await Promise.all([
        api.get(`/rfps/${rfpId}`),
        api.get(`/conversations/${rfpId}`)
      ]);
      setRfp(rfpRes.data);
      setConversations(conversationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (conversationId) => {
    if (!confirm('Accept this as a valid proposal?')) return;

    try {
      const response = await api.post(`/conversations/${conversationId}/accept`);
      alert('✅ Proposal accepted!');
      
      // Check if auto-evaluation should be triggered
      if (response.data.shouldAutoEvaluate) {
        alert('🤖 Triggering automatic re-evaluation...');
        try {
          await api.post(`/proposals/evaluate/${rfpId}`);
          alert('✅ Re-evaluation complete!');
        } catch (evalError) {
          console.error('Auto-evaluation failed:', evalError);
          alert('⚠️ Auto-evaluation failed. You can manually evaluate from the Compare page.');
        }
      }
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error accepting conversation:', error);
      alert(error.response?.data?.error || 'Failed to accept proposal');
    }
  };

  const handleReject = async (conversationId) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      await api.post(`/conversations/${conversationId}/reject`, { reason });
      alert('❌ Conversation rejected');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting conversation:', error);
      alert('Failed to reject conversation');
    }
  };

  const pendingConversations = conversations.filter(c => c.status === 'pending_review');
  const acceptedConversations = conversations.filter(c => c.status === 'accepted');
  const rejectedConversations = conversations.filter(c => c.status === 'rejected');

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
          ← Back to Dashboard
        </button>
        <h1>📬 Vendor Responses - Review</h1>
        <p><strong>RFP:</strong> {rfp?.title}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <span style={{ padding: '0.5rem 1rem', background: '#fef3c7', borderRadius: '6px' }}>
            ⏳ Pending: {pendingConversations.length}
          </span>
          <span style={{ padding: '0.5rem 1rem', background: '#d1fae5', borderRadius: '6px' }}>
            ✅ Accepted: {acceptedConversations.length}
          </span>
          <span style={{ padding: '0.5rem 1rem', background: '#fee2e2', borderRadius: '6px' }}>
            ❌ Rejected: {rejectedConversations.length}
          </span>
        </div>
      </div>

      {/* Pending Reviews */}
      {pendingConversations.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2>⏳ Pending Review ({pendingConversations.length})</h2>
          {pendingConversations.map((conversation) => (
            <ConversationCard
              key={conversation._id}
              conversation={conversation}
              onAccept={handleAccept}
              onReject={handleReject}
              onViewDetails={() => setSelectedConversation(conversation)}
            />
          ))}
        </div>
      )}

      {/* Accepted */}
      {acceptedConversations.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2>✅ Accepted ({acceptedConversations.length})</h2>
          {acceptedConversations.map((conversation) => (
            <ConversationCard
              key={conversation._id}
              conversation={conversation}
              readOnly
              onViewDetails={() => setSelectedConversation(conversation)}
            />
          ))}
        </div>
      )}

      {/* Rejected */}
      {rejectedConversations.length > 0 && (
        <div>
          <h2>❌ Rejected ({rejectedConversations.length})</h2>
          {rejectedConversations.map((conversation) => (
            <ConversationCard
              key={conversation._id}
              conversation={conversation}
              readOnly
              onViewDetails={() => setSelectedConversation(conversation)}
            />
          ))}
        </div>
      )}

      {conversations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No vendor responses yet. Check emails to receive proposals.
        </div>
      )}

      {/* Detail Modal */}
      {selectedConversation && (
        <ConversationDetailModal
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  );
};

const ConversationCard = ({ conversation, onAccept, onReject, onViewDetails, readOnly }) => {
  const parsedAmount = conversation.parsedData?.totalAmount || 0;
  const itemCount = conversation.parsedData?.items?.length || 0;

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '1rem',
      background: readOnly ? '#f9fafb' : 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            🏢 {conversation.vendorId?.name || 'Unknown Vendor'}
          </h3>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
            📧 {conversation.vendorId?.email}
          </p>
          <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
            📅 Received: {new Date(conversation.receivedAt).toLocaleString()}
          </p>
          <p style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>
            💰 Amount: ${parsedAmount.toLocaleString()} | 📦 Items: {itemCount}
          </p>
          {conversation.rejectionReason && (
            <p style={{ margin: '0.5rem 0', color: '#dc2626', fontSize: '0.9rem' }}>
              <strong>Rejection Reason:</strong> {conversation.rejectionReason}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onViewDetails}
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            👁️ View Details
          </button>
          {!readOnly && (
            <>
              <button
                onClick={() => onAccept(conversation._id)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✅ Accept
              </button>
              <button
                onClick={() => onReject(conversation._id)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ❌ Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ConversationDetailModal = ({ conversation, onClose }) => {
  const parsed = conversation.parsedData || {};

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>📄 Full Email Content</h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p><strong>Vendor:</strong> {conversation.vendorId?.name}</p>
          <p><strong>Subject:</strong> {conversation.emailSubject}</p>
          <p><strong>Received:</strong> {new Date(conversation.receivedAt).toLocaleString()}</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3>📦 Parsed Data</h3>
          <p><strong>Total Amount:</strong> ${parsed.totalAmount?.toLocaleString() || 'N/A'}</p>
          <p><strong>Delivery Time:</strong> {parsed.deliveryTime}</p>
          <p><strong>Payment Terms:</strong> {parsed.paymentTerms}</p>
          <p><strong>Warranty:</strong> {parsed.warranty}</p>
          
          {parsed.items && parsed.items.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Items:</strong>
              <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{item.description}</td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>${item.unitPrice}</td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'right' }}>${item.totalPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3>📧 Full Email Content</h3>
          <div style={{
            background: '#f9fafb',
            padding: '1rem',
            borderRadius: '6px',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {conversation.emailContent}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ConversationReview;
