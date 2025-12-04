import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Generate RFP email HTML content
 */
const generateRFPEmailHTML = (rfp) => {
  const itemsHTML = rfp.requirements.items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${JSON.stringify(item.specifications || {})}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #e5e7eb; padding: 10px; text-align: left; border: 1px solid #ddd; }
          .info-section { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #4F46E5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Request for Proposal (RFP)</h1>
          </div>
          <div class="content">
            <h2>${rfp.title}</h2>
            <p>${rfp.description}</p>
            
            <div class="info-section">
              <h3>Requirements</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>
            
            <div class="info-section">
              <h3>Terms & Conditions</h3>
              <p><strong>Budget:</strong> $${rfp.requirements.budget?.toLocaleString() || 'Not specified'}</p>
              <p><strong>Delivery Deadline:</strong> ${rfp.requirements.deliveryDeadline ? new Date(rfp.requirements.deliveryDeadline).toLocaleDateString() : 'Not specified'}</p>
              <p><strong>Payment Terms:</strong> ${rfp.requirements.paymentTerms || 'Not specified'}</p>
              <p><strong>Warranty:</strong> ${rfp.requirements.warranty || 'Not specified'}</p>
            </div>
            
            <div class="info-section">
              <h3>How to Respond</h3>
              <p>Please reply to this email with your proposal including:</p>
              <ul>
                <li>Itemized pricing for all requested items</li>
                <li>Total cost</li>
                <li>Delivery timeline</li>
                <li>Payment terms you offer</li>
                <li>Warranty details</li>
                <li>Any additional information</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666;">
              Thank you for your interest. We look forward to your proposal.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Send RFP to a vendor via email
 */
export const sendRFPToVendor = async (rfp, vendor) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: vendor.email,
      subject: `RFP: ${rfp.title} [ID: ${rfp._id}]`,
      html: generateRFPEmailHTML(rfp),
      replyTo: process.env.EMAIL_USER
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ RFP sent to ${vendor.email}`);
    return { success: true, vendor: vendor.email };
  } catch (error) {
    console.error(`❌ Error sending email to ${vendor.email}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send RFP to multiple vendors
 */
export const sendRFPToVendors = async (rfp, vendors) => {
  const results = [];
  
  for (const vendor of vendors) {
    try {
      const result = await sendRFPToVendor(rfp, vendor);
      results.push({ ...result, status: 'sent' });
    } catch (error) {
      results.push({ 
        success: false, 
        vendor: vendor.email, 
        status: 'failed',
        error: error.message 
      });
    }
  }
  
  return results;
};

/**
 * Handle incoming email webhook from SendGrid
 * This will be used as the webhook endpoint handler
 */
export const parseInboundEmail = (inboundData) => {
  try {
    // SendGrid sends form data, extract relevant fields
    const from = inboundData.from;
    const subject = inboundData.subject;
    const text = inboundData.text || '';
    const html = inboundData.html || '';
    
    return {
      from,
      subject,
      content: text || html,
      receivedAt: new Date()
    };
  } catch (error) {
    console.error('Error parsing inbound email:', error);
    throw new Error('Failed to parse inbound email');
  }
};
