import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI (FREE)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use gemini-2.5-flash (latest free model)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Parse natural language into structured RFP data
 */
export const parseRFPFromText = async (naturalLanguageText) => {
  try {
    const prompt = `
You are an AI assistant that helps convert natural language procurement requests into structured RFP data.

Extract and structure the following information from the text below:
- title: A concise title for the RFP
- description: A brief description
- requirements object containing:
  - items: Array of items needed (each with name, quantity, specifications as object)
  - budget: Total budget as a number
  - deliveryDeadline: Delivery deadline as ISO date string (calculate from "within X days" to actual date)
  - paymentTerms: Payment terms as string
  - warranty: Warranty requirements as string

Text to parse:
"${naturalLanguageText}"

Return ONLY a valid JSON object with the structure above. Do not include any markdown formatting, code blocks, or explanation. Just pure JSON.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Remove markdown code blocks if present
    const jsonString = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedData = JSON.parse(jsonString);
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing RFP with AI:', error);
    throw new Error('Failed to parse RFP: ' + error.message);
  }
};

/**
 * Parse vendor email response into structured proposal data
 */
export const parseVendorResponse = async (emailContent, rfpRequirements) => {
  try {
    const prompt = `
You are an expert procurement data extraction AI. Your task is to extract structured information from a vendor's email response to an RFP.

=== VENDOR EMAIL ===
${emailContent}

=== EXTRACTION REQUIREMENTS ===

You MUST extract the following fields and return them as a JSON object:

**1. items** (MANDATORY - Array of objects)
Extract ALL quoted items/products from the email. Each item must have:
- description: string - Full item name/description (e.g., "Executive Desks - Premium Oak finish")
- quantity: number - Number of units (e.g., 5)
- unitPrice: number - Price per unit WITHOUT currency symbols (e.g., 1200 not "$1,200")
- totalPrice: number - Total price for this item (quantity × unitPrice)
- specifications: string - Any specs, features, or details about the item

Example format:
[
  {
    "description": "Executive Desks",
    "quantity": 5,
    "unitPrice": 1200,
    "totalPrice": 6000,
    "specifications": "Premium Oak finish, modern design"
  }
]

**2. totalCost** (MANDATORY - number)
The TOTAL AMOUNT of the entire proposal as a NUMBER.
- Look for: "Total", "Total Amount", "Grand Total", "Total Cost", "Sum", "Total Price"
- Extract ONLY the numeric value (e.g., 76150 not "$76,150" or "76,150")
- Remove ALL currency symbols ($, ₹, €, £, etc.) and commas
- If not explicitly stated, calculate by summing all item totalPrice values

**3. deliveryTimeline** (MANDATORY - string)
The delivery timeframe/schedule.
- Look for: "Delivery", "Delivery time", "Lead time", "Shipping", "Timeline", "Completion time"
- Examples: "21 days", "3 weeks from order", "30 business days", "Within 1 month"
- If not found, return "Not specified"

**4. paymentTerms** (MANDATORY - string)
Payment conditions and terms.
- Look for: "Payment", "Payment terms", "Terms", "Payment conditions"
- Examples: "Net 30", "Net 45 days", "50% advance, 50% on delivery", "Payment on completion"
- If not found, return "Not specified"

**5. warranty** (MANDATORY - string)
Warranty or guarantee information.
- Look for: "Warranty", "Guarantee", "Warrantee", "Coverage"
- Examples: "2 years", "3-year comprehensive warranty", "1 year manufacturer warranty"
- If not found, return "Not specified"

**6. additionalInfo** (OPTIONAL - string)
Any other important information such as:
- Discounts offered
- Free services included
- Special offers
- Terms and conditions
- Certifications
- Return policy
If nothing relevant, return empty string ""

=== CRITICAL INSTRUCTIONS ===
1. ALL items must be extracted - don't skip any quoted products
2. ALL prices must be pure numbers without currency symbols or commas
3. Calculate totalCost by summing items if not explicitly stated in email
4. Be precise with quantities and prices - extract exact numbers from the email
5. If a mandatory field is truly not present, use: "Not specified" for strings, 0 for numbers, [] for arrays
6. Return ONLY valid JSON - no markdown formatting, no code blocks, no explanations, no extra text

=== EXPECTED JSON FORMAT ===
{
  "items": [...],
  "totalCost": 76150,
  "deliveryTimeline": "21 days",
  "paymentTerms": "Net 45 days",
  "warranty": "3-year comprehensive warranty",
  "additionalInfo": "Free installation included"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the JSON string more thoroughly
    let jsonString = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any trailing commas before closing braces/brackets
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to extract JSON if there's additional text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('   ⚠️ JSON Parse Error:', parseError.message);
      console.error('   📄 Raw AI response:', text.substring(0, 500));
      throw parseError;
    }
    
    // Ensure all mandatory fields exist with defaults
    parsedData.items = parsedData.items || [];
    parsedData.totalCost = parsedData.totalCost || 0;
    parsedData.deliveryTimeline = parsedData.deliveryTimeline || 'Not specified';
    parsedData.paymentTerms = parsedData.paymentTerms || 'Not specified';
    parsedData.warranty = parsedData.warranty || 'Not specified';
    parsedData.additionalInfo = parsedData.additionalInfo || '';
    
    // Fallback: If AI didn't extract totalCost, try regex extraction
    if (!parsedData.totalCost || parsedData.totalCost === 0) {
      const totalRegex = /(?:total|grand\s*total|total\s*amount|total\s*cost|sum)[\s:]*[$₹€£]?\s*(\d+[,\d]*(?:\.\d+)?)/gi;
      const match = emailContent.match(totalRegex);
      if (match && match.length > 0) {
        // Extract the last total found (usually the final total)
        const lastMatch = match[match.length - 1];
        const amountMatch = lastMatch.match(/(\d+[,\d]*(?:\.\d+)?)/);
        if (amountMatch) {
          parsedData.totalCost = parseFloat(amountMatch[1].replace(/,/g, ''));
          console.log('   🔍 Fallback regex found total:', parsedData.totalCost);
        }
      }
    }
    
    // Second fallback: Calculate total from items if still 0
    if ((!parsedData.totalCost || parsedData.totalCost === 0) && parsedData.items.length > 0) {
      parsedData.totalCost = parsedData.items.reduce((sum, item) => {
        const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
        return sum + itemTotal;
      }, 0);
      if (parsedData.totalCost > 0) {
        console.log('   💡 Calculated total from items:', parsedData.totalCost);
      }
    }
    
    // Validate items have all required fields
    if (parsedData.items.length > 0) {
      parsedData.items = parsedData.items.map(item => ({
        description: item.description || item.name || 'Unknown Item', // Support both description and name for backward compatibility
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
        specifications: item.specifications || ''
      }));
    }
    
    console.log(`   📦 Extracted ${parsedData.items.length} items, Total: $${parsedData.totalCost}`);
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing vendor response with AI:', error);
    throw new Error('Failed to parse vendor response: ' + error.message);
  }
};

/**
 * Evaluate and compare proposals using AI
 */
export const evaluateProposals = async (rfpRequirements, proposals) => {
  try {
    const prompt = `
You are an AI assistant that evaluates vendor proposals for procurement.

RFP Requirements:
${JSON.stringify(rfpRequirements, null, 2)}

Vendor Proposals:
${JSON.stringify(proposals.map((p, idx) => ({
  vendor: idx + 1,
  vendorName: p.vendorId?.name || 'Vendor ' + (idx + 1),
  ...p.parsedData
})), null, 2)}

For each proposal, provide:
1. score: A score from 0-100 based on price competitiveness (40%), requirement compliance (30%), and terms favorability (30%)
2. strengths: Array of 2-3 key strengths
3. weaknesses: Array of 2-3 areas of concern
4. recommendation: Brief recommendation text

Also provide an overall recommendation on which vendor to choose and why.

Return as JSON array with format:
{
  "evaluations": [
    {
      "vendorIndex": 0,
      "score": 85,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "recommendation": "..."
    }
  ],
  "overallRecommendation": "Based on the analysis..."
}

Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanation. Just pure JSON.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonString = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const evaluation = JSON.parse(jsonString);
    
    return evaluation;
  } catch (error) {
    console.error('Error evaluating proposals with AI:', error);
    throw new Error('Failed to evaluate proposals: ' + error.message);
  }
};
