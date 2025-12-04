import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rfpAPI } from '../services/api';

function CreateRFP() {
  const [naturalText, setNaturalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedRFP, setParsedRFP] = useState(null);
  const navigate = useNavigate();

  const exampleText = `I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty.`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await rfpAPI.create(naturalText);
      const createdRFP = response.data.rfp;
      setLoading(false);
      
      // Redirect to dashboard immediately with RFP data
      navigate('/', { state: { createdRFP } });
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to create RFP');
      setLoading(false);
    }
  };

  const useExample = () => {
    setNaturalText(exampleText);
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '0.85rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📝 Create New RFP</h1>
        <p className="page-description" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
          Describe your procurement needs in natural language, and AI will structure it for you
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: '1.1rem' }}>
        <div style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>✍️ RFP Requirements</h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
            Tell us what you need - be as detailed as possible
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: '600' }}>
              📋 Describe Your Procurement Needs
            </label>
            <textarea
              className="form-textarea"
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              placeholder="Example: I need to procure 20 laptops with 16GB RAM, budget is $50,000, need delivery within 30 days..."
              required
              style={{ minHeight: '220px', fontSize: '0.9rem', lineHeight: '1.6' }}
            />
            <button
              type="button"
              onClick={useExample}
              style={{
                marginTop: '0.6rem',
                padding: '0.6rem 1.1rem',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              💡 Use Example
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.85rem', 
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !naturalText.trim()}
              style={{ padding: '0.7rem 1.3rem', fontSize: '0.95rem', fontWeight: '600' }}
            >
              {loading ? '⏳ Creating RFP...' : '✨ Create RFP'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              style={{ padding: '0.7rem 1.3rem', fontSize: '0.95rem' }}
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      </div>

      {/* RFP Creation Loading Modal */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '2.2rem',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            minWidth: '340px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <div style={{
              width: '75px',
              height: '75px',
              margin: '0 auto 1.3rem',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#111827',
              fontSize: '1.4rem',
              fontWeight: '700'
            }}>
              ✨ Creating Your RFP
            </h3>
            <p style={{ 
              margin: 0, 
              color: '#6b7280',
              fontSize: '0.95rem',
              lineHeight: '1.6'
            }}>
              AI is processing your requirements...<br/>
              Please wait a moment.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default CreateRFP;
