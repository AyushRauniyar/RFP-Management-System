import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// RFP endpoints
export const rfpAPI = {
  create: (naturalLanguageText) =>
    api.post('/rfps/create', { naturalLanguageText }),
  
  getAll: () => api.get('/rfps'),
  
  getById: (id) => api.get(`/rfps/${id}`),
  
  send: (id, vendorIds) =>
    api.post(`/rfps/${id}/send`, { vendorIds }),
  
  delete: (id) => api.delete(`/rfps/${id}`),
};

// Vendor endpoints
export const vendorAPI = {
  create: (vendorData) => api.post('/vendors', vendorData),
  
  getAll: () => api.get('/vendors'),
  
  getById: (id) => api.get(`/vendors/${id}`),
  
  update: (id, vendorData) => api.put(`/vendors/${id}`, vendorData),
  
  delete: (id) => api.delete(`/vendors/${id}`),
};

// Proposal endpoints
export const proposalAPI = {
  getByRFP: (rfpId) => api.get(`/proposals/rfp/${rfpId}`),
  
  getById: (id) => api.get(`/proposals/${id}`),
  
  simulateResponse: (proposalId, emailContent) =>
    api.post('/proposals/simulate-response', { proposalId, emailContent }),
  
  evaluate: (rfpId) => api.post(`/proposals/evaluate/${rfpId}`),
  
  checkEmails: () => api.post('/proposals/check-emails'),
};

export default api;
