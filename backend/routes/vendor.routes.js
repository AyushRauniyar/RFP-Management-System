import express from 'express';
import Vendor from '../models/Vendor.js';

const router = express.Router();

/**
 * POST /api/vendors
 * Create a new vendor
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, contactPerson, phone, specializations } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const vendor = new Vendor({
      name,
      email,
      contactPerson,
      phone,
      specializations: specializations || []
    });

    await vendor.save();

    res.status(201).json({
      message: 'Vendor created successfully',
      vendor
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ 
      error: 'Failed to create vendor', 
      details: error.message 
    });
  }
});

/**
 * GET /api/vendors
 * Get all vendors
 */
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

/**
 * GET /api/vendors/:id
 * Get a single vendor by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

/**
 * PUT /api/vendors/:id
 * Update a vendor
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, contactPerson, phone, specializations } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { name, email, contactPerson, phone, specializations },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      message: 'Vendor updated successfully',
      vendor
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ 
      error: 'Failed to update vendor', 
      details: error.message 
    });
  }
});

/**
 * DELETE /api/vendors/:id
 * Delete a vendor
 */
router.delete('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

export default router;
