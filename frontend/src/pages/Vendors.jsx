import { useState, useEffect } from 'react';
import { vendorAPI } from '../services/api';

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactPerson: '',
    phone: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await vendorAPI.getAll();
      setVendors(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load vendors', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing vendor
        await vendorAPI.update(editingId, formData);
      } else {
        // Create new vendor
        await vendorAPI.create(formData);
      }
      setFormData({ name: '', email: '', contactPerson: '', phone: '' });
      setShowForm(false);
      setEditingId(null);
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
    setFormData({
      name: vendor.name,
      email: vendor.email,
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || ''
    });
    setEditingId(vendor._id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', contactPerson: '', phone: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await vendorAPI.delete(id);
        fetchVendors();
      } catch (err) {
        alert('Failed to delete vendor');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '0.85rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Vendor Management</h1>
        <p className="page-description" style={{ fontSize: '1rem' }}>Manage your vendor database</p>
      </div>

      <div className="card" style={{ padding: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>📋 All Vendors</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
              {vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'} registered
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '0.7rem 1.1rem', fontSize: '0.95rem' }}
            onClick={() => {
              if (!showForm) {
                setShowForm(true);
              } else {
                handleCancel();
              }
            }}
          >
            {showForm ? '❌ Cancel' : '➕ Add Vendor'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#f9fafb', padding: '1.1rem', borderRadius: '6px', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.85rem', color: '#111827', fontSize: '1.2rem' }}>{editingId ? '✏️ Edit Vendor' : '➕ Add New Vendor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.9rem' }}>Vendor Name *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.9rem' }}>Email *</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.9rem' }}>Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.9rem' }}>Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.1rem', fontSize: '0.9rem' }}>
                  {editingId ? '💾 Update Vendor' : '➕ Add Vendor'}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.1rem', fontSize: '0.9rem' }}
                    onClick={handleCancel}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {vendors.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '1.75rem', fontSize: '0.95rem' }}>
            No vendors yet. Add your first vendor to get started!
          </p>
        ) : (
          <div>
            <table className="table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>Name</th>
                  <th style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>Email</th>
                  <th style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>Contact Person</th>
                  <th style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>Phone</th>
                  <th style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id}>
                    <td style={{ padding: '0.7rem 0.85rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>🏢 {vendor.name}</strong>
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>
                      <a href={`mailto:${vendor.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        📧 {vendor.email}
                      </a>
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>
                      {vendor.contactPerson ? `👤 ${vendor.contactPerson}` : '-'}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', fontSize: '0.9rem' }}>
                      {vendor.phone ? `📞 ${vendor.phone}` : '-'}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.9rem', fontSize: '0.875rem' }}
                          onClick={() => handleEdit(vendor)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.5rem 0.9rem', fontSize: '0.875rem' }}
                          onClick={() => handleDelete(vendor._id)}
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

export default Vendors;
