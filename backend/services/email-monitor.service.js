import Imap from 'imap';
import { simpleParser } from 'mailparser';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import Tesseract from 'tesseract.js';
import Proposal from '../models/Proposal.js';
import RFP from '../models/RFP.js';
import Vendor from '../models/Vendor.js';
import Conversation from '../models/Conversation.js';
import { parseVendorResponse } from './ai.service.js';

dotenv.config();

// Configure DNS to use Google's DNS servers as fallback
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const dnsLookup = promisify(dns.lookup);

let emailMonitorInterval = null;
let isMonitoring = false;

/**
 * Configure IMAP connection for Gmail with optimized settings
 */
const getImapConfig = () => ({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { 
    rejectUnauthorized: false,
    // Add keep-alive to prevent connection drops
    keepAlive: true,
    keepAliveInitialDelay: 10000 // 10 seconds
  },
  connTimeout: 30000, // 30 second connection timeout
  authTimeout: 30000,  // 30 second auth timeout
  keepalive: {
    interval: 10000,   // Send keep-alive every 10 seconds
    idleInterval: 300000, // 5 minutes
    forceNoop: true    // Force NOOP commands to keep connection alive
  }
});

/**
 * Get list of vendor emails from all RFPs
 */
const getVendorEmails = async () => {
  // Get all RFPs that are sent or have received responses (not just 'sent')
  const rfps = await RFP.find({ 
    status: { $in: ['sent', 'responses_received', 'evaluated'] } 
  }).populate('sentTo');
  
  const vendorEmails = new Set();
  
  rfps.forEach(rfp => {
    rfp.sentTo.forEach(vendor => {
      vendorEmails.add(vendor.email.toLowerCase());
    });
  });
  
  return Array.from(vendorEmails);
};

/**
 * Extract text from PDF buffer
 */
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('   ❌ Error extracting PDF text:', error.message);
    return null;
  }
};

/**
 * Extract text from Word document buffer (.docx)
 */
const extractTextFromWord = async (wordBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: wordBuffer });
    return result.value;
  } catch (error) {
    console.error('   ❌ Error extracting Word text:', error.message);
    return null;
  }
};

/**
 * Extract text from Excel spreadsheet buffer (.xlsx, .xls)
 */
const extractTextFromExcel = async (excelBuffer) => {
  try {
    const workbook = xlsx.read(excelBuffer, { type: 'buffer' });
    let extractedText = '';
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      extractedText += `\n--- Sheet: ${sheetName} ---\n`;
      const sheet = workbook.Sheets[sheetName];
      
      // Convert sheet to CSV format for better structure
      const csv = xlsx.utils.sheet_to_csv(sheet);
      extractedText += csv + '\n';
    });
    
    return extractedText.trim();
  } catch (error) {
    console.error('   ❌ Error extracting Excel text:', error.message);
    return null;
  }
};

/**
 * Extract text from image using OCR (jpg, png, gif, bmp)
 */
const extractTextFromImage = async (imageBuffer) => {
  try {
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: () => {} // Suppress verbose logging
    });
    return result.data.text;
  } catch (error) {
    console.error('   ❌ Error extracting image text:', error.message);
    return null;
  }
};

/**
 * Process email attachments and extract text content
 */
const processAttachments = async (attachments) => {
  if (!attachments || attachments.length === 0) {
    console.log('   ℹ️  No attachments to process');
    return null;
  }

  console.log(`   📎 Found ${attachments.length} attachment(s)`);
  
  let extractedText = '';
  
  for (const attachment of attachments) {
    const filename = attachment.filename || 'unknown';
    const contentType = attachment.contentType || '';
    const filenameLower = filename.toLowerCase();
    const hasContent = attachment.content && attachment.content.length > 0;
    
    console.log(`   📄 Processing attachment: ${filename} (${contentType}), has content: ${hasContent}, size: ${attachment.content?.length || 0} bytes`);
    
    if (!hasContent) {
      console.log(`   ⚠️  Attachment has no content buffer, skipping: ${filename}`);
      continue;
    }
    
    let extractedContent = null;
    
    // Handle PDF attachments
    if (contentType.includes('pdf') || filenameLower.endsWith('.pdf')) {
      console.log(`   🔍 Extracting text from PDF: ${filename}`);
      extractedContent = await extractTextFromPDF(attachment.content);
    }
    // Handle Word documents (.docx, .doc)
    else if (contentType.includes('wordprocessingml') || 
             contentType.includes('msword') ||
             filenameLower.endsWith('.docx') || 
             filenameLower.endsWith('.doc')) {
      console.log(`   🔍 Extracting text from Word document: ${filename}`);
      extractedContent = await extractTextFromWord(attachment.content);
    }
    // Handle Excel spreadsheets (.xlsx, .xls)
    else if (contentType.includes('spreadsheetml') || 
             contentType.includes('ms-excel') ||
             filenameLower.endsWith('.xlsx') || 
             filenameLower.endsWith('.xls')) {
      console.log(`   🔍 Extracting text from Excel spreadsheet: ${filename}`);
      extractedContent = await extractTextFromExcel(attachment.content);
    }
    // Handle Image files (.jpg, .jpeg, .png, .gif, .bmp)
    else if (contentType.includes('image/') ||
             filenameLower.endsWith('.jpg') ||
             filenameLower.endsWith('.jpeg') ||
             filenameLower.endsWith('.png') ||
             filenameLower.endsWith('.gif') ||
             filenameLower.endsWith('.bmp')) {
      console.log(`   🔍 Extracting text from image (OCR): ${filename}`);
      extractedContent = await extractTextFromImage(attachment.content);
    }
    else {
      console.log(`   ⏭️  Unsupported file type: ${filename}`);
      continue;
    }
    
    if (extractedContent) {
      console.log(`   ✅ Extracted ${extractedContent.length} characters from ${filename}`);
      extractedText += `\n\n=== Content from ${filename} ===\n${extractedContent}\n`;
    } else {
      console.log(`   ⚠️  Failed to extract text from: ${filename}`);
    }
  }
  
  return extractedText.trim() || null;
};

/**
 * Process a single email message
 */
const processEmail = async (emailData, seqno) => {
  try {
    const { subject, from, text, html, date, attachments } = emailData;
    
    console.log(`📧 Processing email from: ${from.text}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   📎 Attachments in email:`, attachments ? attachments.length : 0);
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        console.log(`      - ${att.filename || 'unnamed'} (${att.contentType || 'unknown type'}), size: ${att.size || att.content?.length || 0} bytes`);
      });
    }

    // Extract email address from "from" field
    const emailMatch = from.text.match(/<(.+?)>/) || from.text.match(/([^\s]+@[^\s]+)/);
    const vendorEmail = emailMatch ? (emailMatch[1] || emailMatch[0]) : from.text;
    const vendorEmailLower = vendorEmail.toLowerCase();

    // Get list of known vendor emails
    const knownVendorEmails = await getVendorEmails();
    
    // Only process emails from known vendors
    if (!knownVendorEmails.includes(vendorEmailLower)) {
      console.log(`   ⏭️  Email not from a known vendor (${vendorEmail}), skipping...`);
      return false;
    }

    console.log(`   ✅ Email from known vendor: ${vendorEmail}`);

    // Check if it's a reply to an RFP (subject contains "RE: RFP:")
    if (!subject || !subject.toLowerCase().includes('re:') || !subject.toLowerCase().includes('rfp')) {
      console.log('   ⏭️  Not an RFP reply, skipping...');
      return false;
    }

    // Get email content (prefer text, fallback to html)
    let emailContent = text || html || '';
    
    // Process PDF attachments and extract text
    const attachmentText = await processAttachments(attachments);
    
    if (attachmentText) {
      console.log('   📎 Adding attachment content to email body');
      emailContent = emailContent + '\n\n' + attachmentText;
    }
    
    if (!emailContent) {
      console.log('   ❌ Empty email content and no extractable attachments');
      return false;
    }
    
    console.log(`   📝 Total content length: ${emailContent.length} characters`);

    // Extract RFP ID from email subject (format: "Re: RFP: Title [ID: 123abc...]")
    const rfpIdMatch = subject.match(/\[ID:\s*([a-f0-9]{24})\]/i);
    let matchedRFP = null;

    if (rfpIdMatch) {
      // Direct match by RFP ID - most accurate method
      const rfpId = rfpIdMatch[1];
      console.log(`   🔑 Extracted RFP ID from subject: ${rfpId}`);
      
      matchedRFP = await RFP.findById(rfpId).populate('sentTo');
      
      if (matchedRFP) {
        // Verify this vendor was sent this RFP
        const sentToEmails = matchedRFP.sentTo.map(v => v.email.toLowerCase());
        if (sentToEmails.includes(vendorEmailLower)) {
          console.log(`   ✅ Matched RFP by ID: ${matchedRFP.title}`);
        } else {
          console.log(`   ⚠️  RFP found but vendor not in recipient list`);
          matchedRFP = null;
        }
      } else {
        console.log(`   ⚠️  RFP ID not found in database`);
      }
    }

    // Fallback: Try subject-based matching (for old emails without ID)
    if (!matchedRFP) {
      console.log(`   📝 Falling back to subject-based matching...`);
      const rfps = await RFP.find({ status: { $in: ['sent', 'responses_received', 'evaluated'] } }).populate('sentTo');
      let bestMatchScore = 0;
      let bestMatchPercentage = 0;
      const subjectLower = subject.toLowerCase();
      
      for (const rfp of rfps) {
        const sentToEmails = rfp.sentTo.map(v => v.email.toLowerCase());
        if (sentToEmails.includes(vendorEmailLower)) {
          const titleWords = rfp.title.toLowerCase().split(' ').filter(w => w.length > 3);
          const matchScore = titleWords.filter(word => subjectLower.includes(word)).length;
          const matchPercentage = titleWords.length > 0 ? (matchScore / titleWords.length) : 0;
          
          if (matchScore >= 2 && matchPercentage > bestMatchPercentage) {
            matchedRFP = rfp;
            bestMatchScore = matchScore;
            bestMatchPercentage = matchPercentage;
          }
        }
      }

      if (matchedRFP) {
        console.log(`   🎯 Subject match: ${bestMatchScore} words (${Math.round(bestMatchPercentage * 100)}% match) - ${matchedRFP.title}`);
      }
    }

    // Last resort: Use most recent RFP for this vendor
    if (!matchedRFP) {
      console.log(`   ⚠️  No ID or subject match, using most recent RFP...`);
      const rfps = await RFP.find({ status: { $in: ['sent', 'responses_received', 'evaluated'] } }).populate('sentTo');
      for (const rfp of rfps.sort((a, b) => b.createdAt - a.createdAt)) {
        const sentToEmails = rfp.sentTo.map(v => v.email.toLowerCase());
        if (sentToEmails.includes(vendorEmailLower)) {
          matchedRFP = rfp;
          console.log(`   ✅ Using most recent RFP: ${matchedRFP.title}`);
          break;
        }
      }
    }

    if (!matchedRFP) {
      console.log(`   ❌ No matching RFP found for vendor: ${vendorEmail}`);
      return false;
    }

    // Find vendor by email
    const vendor = await Vendor.findOne({ email: vendorEmail });
    if (!vendor) {
      console.log(`   ⚠️  Vendor not found in database: ${vendorEmail}`);
      return false;
    }

    // Check if conversation already exists for this vendor and RFP
    let existingConversation = await Conversation.findOne({
      rfpId: matchedRFP._id,
      vendorId: vendor._id
    });

    // Use AI to parse vendor response
    console.log('   🤖 Parsing with AI...');
    const parsedData = await parseVendorResponse(emailContent);

    // Auto-calculate total if AI didn't extract it or if it's missing
    let totalAmount = parsedData.totalCost || 0;
    
    // If totalAmount is 0 or missing, calculate from items
    if (!totalAmount && parsedData.items && parsedData.items.length > 0) {
      totalAmount = parsedData.items.reduce((sum, item) => {
        const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
        return sum + itemTotal;
      }, 0);
      console.log(`   💡 Auto-calculated total from ${parsedData.items.length} items: $${totalAmount}`);
    }

    const conversationData = {
      emailSubject: subject,
      emailContent: emailContent,
      parsedData: {
        items: parsedData.items || [],
        totalAmount: totalAmount,
        deliveryTime: parsedData.deliveryTimeline || 'Not specified',
        paymentTerms: parsedData.paymentTerms || 'Not specified',
        warranty: parsedData.warranty || 'Not specified',
        additionalNotes: parsedData.additionalInfo || ''
      },
      status: 'pending_review',
      receivedAt: date || new Date(),
      parsedAt: new Date(),
      rejectionReason: null // Clear any previous rejection reason
    };

    if (existingConversation) {
      // Update existing conversation (might have been rejected before)
      console.log(`   🔄 Updating existing conversation (previous status: ${existingConversation.status})`);
      Object.assign(existingConversation, conversationData);
      await existingConversation.save();
      console.log(`   ✅ Conversation updated and reset to pending_review!`);
    } else {
      // Create new conversation
      const conversation = new Conversation({
        rfpId: matchedRFP._id,
        vendorId: vendor._id,
        ...conversationData
      });
      await conversation.save();
      console.log(`   ✅ New conversation saved for review!`);
    }
    
    console.log(`   💰 Parsed Amount: $${totalAmount}`);
    console.log(`   ⏳ Status: pending_review - awaiting manual acceptance`);
    
    // Update RFP status to 'responses_received' when first conversation is received
    if (matchedRFP.status === 'sent') {
      matchedRFP.status = 'responses_received';
      await matchedRFP.save();
      console.log(`   📬 RFP status updated to 'responses_received'`);
    }
    
    return true;

  } catch (error) {
    console.error(`   ❌ Error processing email:`, error.message);
    console.error(`   Stack:`, error.stack);
    return false;
  }
};

/**
 * Fetch and process unread emails with timeout and retry
 */
const fetchUnreadEmails = async () => {
  // First, check if we can resolve Gmail's IMAP server
  try {
    await dnsLookup('imap.gmail.com');
  } catch (dnsError) {
    throw new Error(`DNS lookup failed for imap.gmail.com: ${dnsError.message}`);
  }

  return new Promise((resolve, reject) => {
    const imap = new Imap(getImapConfig());
    let isResolved = false;

    // Set connection timeout (30 seconds)
    const connectionTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        imap.end();
        reject(new Error('Connection timeout after 30 seconds'));
      }
    }, 30000);

    imap.once('ready', () => {
      clearTimeout(connectionTimeout);
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for unread emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            reject(err);
            imap.end();
            return;
          }

          if (!results || results.length === 0) {
            console.log('📭 No new emails');
            imap.end();
            resolve(0);
            return;
          }

          console.log(`📬 Found ${results.length} unread email(s)`);

          // Only process last 10 unread emails (most recent)
          const emailsToProcess = results.slice(-10);
          
          if (emailsToProcess.length < results.length) {
            console.log(`   ℹ️  Processing only last ${emailsToProcess.length} emails (most recent)`);
          }

          const fetch = imap.fetch(emailsToProcess, { bodies: '', markSeen: true });
          const emailPromises = [];

          fetch.on('message', (msg, seqno) => {
            const emailPromise = new Promise((resolveMsg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    console.error('Error parsing email:', err);
                    resolveMsg(false);
                    return;
                  }
                  try {
                    await processEmail(parsed, seqno);
                    resolveMsg(true);
                  } catch (error) {
                    console.error('Error in processEmail:', error);
                    resolveMsg(false);
                  }
                });
              });
            });
            emailPromises.push(emailPromise);
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            reject(err);
          });

          fetch.once('end', async () => {
            // Wait for all emails to be processed
            const results = await Promise.all(emailPromises);
            const processed = results.filter(r => r === true).length;
            console.log(`✅ Processed ${processed} email(s)`);
            imap.end();
            clearTimeout(connectionTimeout);
            if (!isResolved) {
              isResolved = true;
              resolve(processed);
            }
          });
        });
      });
    });

    imap.once('error', (err) => {
      clearTimeout(connectionTimeout);
      if (!isResolved) {
        isResolved = true;
        console.error('IMAP Error:', err);
        reject(err);
      }
    });

    imap.once('end', () => {
      clearTimeout(connectionTimeout);
    });

    // Attempt connection
    try {
      imap.connect();
    } catch (err) {
      clearTimeout(connectionTimeout);
      if (!isResolved) {
        isResolved = true;
        reject(err);
      }
    }
  });
};

/**
 * Start monitoring emails every 5 minutes
 */
export const startEmailMonitoring = () => {
  if (isMonitoring) {
    console.log('📧 Email monitoring already running');
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials not configured');
    return;
  }

  console.log('📧 Starting email monitoring...');
  console.log(`   Email: ${process.env.EMAIL_USER}`);
  console.log('   Checking every 5 minutes for vendor responses');
  console.log('   Only processing emails from known vendors');
  
  isMonitoring = true;

  // Check immediately on start
  fetchUnreadEmails().catch(err => {
    console.error('Error checking emails:', err.message);
  });

  // Then check every 5 minutes with retry logic
  emailMonitorInterval = setInterval(async () => {
    console.log('⏰ Scheduled email check (every 5 minutes)...');
    
    // Retry logic: try up to 3 times with delays
    let retries = 3;
    let delay = 5000; // Start with 5 seconds
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`   🔄 Retry attempt ${attempt}/${retries}...`);
        }
        await fetchUnreadEmails();
        break; // Success, exit retry loop
      } catch (error) {
        const isNetworkError = error.code === 'ENOTFOUND' || 
                               error.code === 'ETIMEDOUT' || 
                               error.code === 'ECONNREFUSED' ||
                               error.message?.includes('timeout');
        
        if (isNetworkError && attempt < retries) {
          console.log(`   ⚠️  Network issue (attempt ${attempt}/${retries}) - retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff: 5s, 10s, 20s
        } else if (isNetworkError && attempt === retries) {
          console.log('   ❌ All retry attempts failed - network unavailable');
          console.log('   💡 Manual "Check Emails" button still works!');
        } else {
          console.error('   ❌ Error in email monitoring:', error.message);
        }
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
};

/**
 * Stop monitoring emails
 */
export const stopEmailMonitoring = () => {
  if (emailMonitorInterval) {
    clearInterval(emailMonitorInterval);
    emailMonitorInterval = null;
    isMonitoring = false;
    console.log('📧 Email monitoring stopped');
  }
};

/**
 * Check emails manually (for testing)
 */
export const checkEmailsNow = async () => {
  console.log('🔍 Manually checking for new emails...');
  try {
    const count = await fetchUnreadEmails();
    return { success: true, count };
  } catch (error) {
    console.error('Error checking emails:', error);
    return { success: false, error: error.message };
  }
};
