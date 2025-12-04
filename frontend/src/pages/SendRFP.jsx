import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rfpAPI, vendorAPI } from '../services/api';

function SendRFP() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [rfpResponse, vendorsResponse] = await Promise.all([
        rfpAPI.getById(id),
        vendorAPI.getAll()
      ]);
      setRfp(rfpResponse.data);
      setVendors(vendorsResponse.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const toggleVendor = (vendorId) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSend = async () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor');
      return;
    }

    setSending(true);
    try {
      await rfpAPI.send(id, selectedVendors);
      alert('RFP sent successfully!');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.details || 'Failed to send RFP');
      setSending(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!rfp) return <div className="error">RFP not found</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Send RFP</h1>
        <p className="page-description">Select vendors to send this RFP to</p>
      </div>

      {/* RFP Details */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: '#111827' }}>{rfp.title}</h2>
        <p style={{ color: '#4b5563', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{rfp.description}</p>
        
        <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: '#111827' }}>Requirements</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: '#1f2937' }}><strong style={{ color: '#374151' }}>Budget:</strong> ${rfp.requirements?.budget?.toLocaleString()}</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: '#1f2937' }}><strong style={{ color: '#374151' }}>Delivery Deadline:</strong> {rfp.requirements?.deliveryDeadline ? new Date(rfp.requirements.deliveryDeadline).toLocaleDateString() : 'Not specified'}</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: '#1f2937' }}><strong style={{ color: '#374151' }}>Payment Terms:</strong> {rfp.requirements?.paymentTerms || 'Not specified'}</p>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: '#1f2937' }}><strong style={{ color: '#374151' }}>Warranty:</strong> {rfp.requirements?.warranty || 'Not specified'}</p>
          
          <h4 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', fontSize: '0.9rem', color: '#374151' }}>Items:</h4>
          <ul style={{ fontSize: '0.85rem', marginLeft: '1.25rem', color: '#1f2937' }}>
            {rfp.requirements?.items?.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>
                {item.quantity} x {item.name}
                {item.specifications && ` (${JSON.stringify(item.specifications)})`}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Vendor Selection */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📧 Select Vendors</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
              {selectedVendors.length} of {vendors.length} vendor(s) selected
            </p>
          </div>
          {vendors.length > 0 && (
            <button
              onClick={() => setSelectedVendors(
                selectedVendors.length === vendors.length 
                  ? [] 
                  : vendors.map(v => v._id)
              )}
              style={{
                padding: '0.5rem 1rem',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {selectedVendors.length === vendors.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        
        {vendors.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '1rem' }}>
              No vendors available
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Please add vendors before sending RFPs
            </p>
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'grid', 
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              {vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  style={{
                    padding: '1.25rem',
                    border: selectedVendors.includes(vendor._id) 
                      ? '2px solid #667eea' 
                      : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: selectedVendors.includes(vendor._id) 
                      ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' 
                      : 'white',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedVendors.includes(vendor._id)
                      ? '0 4px 12px rgba(102, 126, 234, 0.15)'
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    transform: selectedVendors.includes(vendor._id) ? 'scale(1.01)' : 'scale(1)'
                  }}
                  onClick={() => toggleVendor(vendor._id)}
                  onMouseEnter={(e) => {
                    if (!selectedVendors.includes(vendor._id)) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedVendors.includes(vendor._id)) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      marginTop: '2px',
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(vendor._id)}
                        onChange={(e) => e.stopPropagation()}
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          cursor: 'pointer',
                          pointerEvents: 'none',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundColor: 'white',
                          border: '2px solid #000000',
                          borderRadius: '4px',
                          outline: 'none',
                          position: 'relative'
                        }}
                      />
                      {selectedVendors.includes(vendor._id) && (
                        <div style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#667eea',
                          borderRadius: '4px',
                          border: '2px solid #000000',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: '#111827',
                        marginBottom: '0.5rem'
                      }}>
                        {vendor.name}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#6b7280',
                        fontSize: '0.95rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span>📧</span>
                        <span>{vendor.email}</span>
                      </div>
                      {vendor.contactPerson && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#9ca3af', 
                          fontSize: '0.875rem'
                        }}>
                          <span>👤</span>
                          <span>{vendor.contactPerson}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#9ca3af', 
                          fontSize: '0.875rem',
                          marginTop: '0.25rem'
                        }}>
                          <span>📱</span>
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                    </div>
                    {selectedVendors.includes(vendor._id) && (
                      <div style={{
                        background: '#667eea',
                        color: 'white',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Selected
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={sending || selectedVendors.length === 0}
                style={{
                  flex: 1,
                  fontSize: '1.05rem',
                  padding: '0.875rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'white'
                }}
              >
                {sending ? (
                  <>
                    <span style={{ color: 'white' }}>🔄</span>
                    <span style={{ color: 'white' }}>Sending...</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'white' }}>📤</span>
                    <span style={{ color: 'white' }}>Send RFP to {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                style={{
                  padding: '0.875rem 1.5rem'
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Sending RFP Loading Modal */}
      {sending && (
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
              📤 Sending RFP
            </h3>
            <p style={{ 
              margin: 0, 
              color: '#6b7280',
              fontSize: '1rem',
              lineHeight: '1.5'
            }}>
              Sending to {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''}...<br/>
              Please wait a moment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SendRFP;
