import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { rfpAPI } from '../services/api';

function Dashboard() {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdRFP, setCreatedRFP] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetchRFPs();
    
    // Check if we were redirected from CreateRFP with a new RFP
    if (location.state?.createdRFP) {
      setCreatedRFP(location.state.createdRFP);
      setShowSuccessPopup(true);
      
      // Auto-hide after 7 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 7000);
      
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchRFPs = async () => {
    try {
      const response = await rfpAPI.getAll();
      setRfps(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load RFPs');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this RFP?')) {
      try {
        await rfpAPI.delete(id);
        fetchRFPs();
      } catch (err) {
        alert('Failed to delete RFP');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      {/* Success Popup */}
      {showSuccessPopup && createdRFP && (
        <div className="card" style={{ 
          position: 'fixed',
          top: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '600px',
          zIndex: 1000,
          background: '#f0fdf4', 
          borderLeft: '4px solid #22c55e',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.5s ease-out',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '0.8rem', fontSize: '1.2rem' }}>✅ RFP Created Successfully!</h3>
            <button 
              onClick={() => setShowSuccessPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          <div style={{ background: 'white', padding: '0.85rem', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.45rem' }}><strong>Title:</strong> {createdRFP.title}</h4>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.45rem' }}><strong>Description:</strong> {createdRFP.description}</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.45rem' }}><strong>Budget:</strong> ${createdRFP.requirements?.budget?.toLocaleString()}</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}><strong>Items:</strong></p>
            <ul style={{ marginLeft: '1.5rem', fontSize: '0.875rem' }}>
              {createdRFP.requirements?.items?.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  {item.quantity} x {item.name}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>
              ⏱️ This notification will disappear in 7 seconds
            </p>
          </div>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '0.85rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Dashboard</h1>
        <p className="page-description" style={{ fontSize: '1rem' }}>Manage your RFPs and track proposals</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: '1.1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>📋 All RFPs</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
              {rfps.length} {rfps.length === 1 ? 'RFP' : 'RFPs'} total
            </p>
          </div>
          <Link to="/create-rfp">
            <button className="btn btn-primary" style={{ padding: '0.7rem 1.1rem', fontSize: '0.95rem' }}>➕ Create New RFP</button>
          </Link>
        </div>

        {rfps.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '1.75rem', fontSize: '0.95rem' }}>
            No RFPs yet. Create your first RFP to get started!
          </p>
        ) : (
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <table className="table" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>RFP ID</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Title</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Budget</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Vendor Responses</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>AI Recommendation</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rfps.map((rfp) => (
                  <tr key={rfp._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '180px' }}>
                      <code style={{ 
                        fontSize: '0.7rem', 
                        background: '#f3f4f6', 
                        padding: '0.35rem 0.55rem',
                        borderRadius: '4px',
                        color: '#4b5563',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        display: 'block',
                        lineHeight: '1.4'
                      }}>
                        {rfp._id}
                      </code>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{rfp.title}</strong>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: '500', color: '#059669' }}>${rfp.requirements?.budget?.toLocaleString() || 'N/A'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${rfp.status}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>
                        {rfp.status === 'responses_received' ? '📬 Responses Received' :
                         rfp.status === 'evaluated' ? '✅ Evaluated' :
                         rfp.status === 'sent' ? '📤 Sent' :
                         rfp.status === 'draft' ? '📝 Draft' :
                         rfp.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {rfp.proposalStats ? (
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{ 
                              color: rfp.proposalStats.responded > 0 ? '#059669' : '#6b7280',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              ✓ {rfp.proposalStats.responded}
                            </span>
                            <span style={{ color: '#d1d5db' }}>|</span>
                            <span style={{ 
                              color: rfp.proposalStats.pending > 0 ? '#f59e0b' : '#6b7280',
                              fontSize: '0.9rem'
                            }}>
                              ⏳ {rfp.proposalStats.pending}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {rfp.proposalStats.responded} responded / {rfp.proposalStats.total} sent
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No vendors yet</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {rfp.topRecommendation ? (
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{
                              background: rfp.topRecommendation.score >= 80 ? '#dcfce7' : 
                                         rfp.topRecommendation.score >= 60 ? '#fef3c7' : '#fee2e2',
                              color: rfp.topRecommendation.score >= 80 ? '#166534' : 
                                     rfp.topRecommendation.score >= 60 ? '#92400e' : '#991b1b',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {rfp.topRecommendation.score}/100
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                            {rfp.topRecommendation.vendorName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '500' }}>
                            ${rfp.topRecommendation.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ 
                          color: '#9ca3af',
                          fontSize: '0.875rem',
                          fontStyle: 'italic'
                        }}>
                          {rfp.proposalStats?.responded > 0 ? 'Not evaluated yet' : 'Awaiting responses'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        {rfp.status === 'draft' ? (
                          <Link to={`/send-rfp/${rfp._id}`}>
                            <button className="btn btn-primary" style={{ 
                              padding: '0.5rem 0.9rem', 
                              fontSize: '0.875rem',
                              width: '100%'
                            }}>
                              📤 Send
                            </button>
                          </Link>
                        ) : (
                          <Link to={`/compare/${rfp._id}`}>
                            <button className="btn btn-primary" style={{ 
                              padding: '0.5rem 0.9rem', 
                              fontSize: '0.875rem',
                                width: '100%'
                              }}>
                                📊 Analyze
                              </button>
                            </Link>
                        )}
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.5rem 0.9rem', fontSize: '0.875rem' }}
                          onClick={() => handleDelete(rfp._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
