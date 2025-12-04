# 🎯 AI-Powered RFP Management System

An intelligent system that automates the complete RFP workflow - from natural language creation to AI-powered proposal evaluation. Features automatic email monitoring, multi-format document extraction (PDF, Word, Excel, Images), and intelligent vendor comparison.

## 📹 Demo Video
**[→ Watch the demo here](your-video-link-here)**

## ✨ Key Features
- **Natural Language RFP Creation**: Describe needs in plain English, AI structures the RFP
- **Automatic Email Monitoring**: Checks Gmail every 5 minutes for vendor responses
- **Multi-Format Extraction**: Processes PDF, Word, Excel, and images with OCR
- **Two-Stage Workflow**: Review responses before triggering AI evaluation
- **AI Evaluation**: Scores proposals on price, compliance, and terms with detailed analysis
- **Vendor Management**: Full CRUD with unique email validation

---

## 1. Project Setup

### Prerequisites

**Required Software:**
- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **MongoDB Atlas**: Free M0 cluster ([Sign up](https://www.mongodb.com/cloud/atlas/register))
- **Google Gemini API**: FREE API key ([Get key](https://aistudio.google.com/app/apikey))
- **Gmail Account**: With IMAP enabled for email automation

### Installation Steps

**1. Clone Repository**
```bash
git clone <repository-url>
cd "RFP Management System"
```

**2. Backend Setup**
```bash
cd backend
npm install
```

**3. Frontend Setup**
```bash
cd ../frontend
npm install
```

### Email Configuration

**Enable Gmail IMAP & App Password:**

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Visit [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Name it "RFP System"
   - Copy the 16-character password

3. **Enable IMAP**
   - Gmail → Settings → "Forwarding and POP/IMAP"
   - Enable IMAP → Save Changes

4. **Configure Backend .env**
```env
# Copy backend/.env.example to backend/.env

# MongoDB (from MongoDB Atlas dashboard)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rfp-system

# Google Gemini API (FREE - no credit card)
GEMINI_API_KEY=your-gemini-api-key

# Gmail (use app password, not regular password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Server Config
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Running Locally

**1. Start Backend** (in backend folder)
```bash
npm run dev
```
Backend runs on: http://localhost:5000

**2. Start Frontend** (in new terminal, frontend folder)
```bash
npm run dev
```
Frontend runs on: http://localhost:5173

**3. Access Application**
- Open browser: http://localhost:5173
- System is ready to use!

### Seed Data / Initial Setup

**No seed data required.** Simply:
1. Add vendors through the UI (Vendors page)
2. Create your first RFP using natural language
3. Send to vendors and start receiving proposals

---

## 2. Tech Stack

### Frontend
- **React** 18.2.0 - UI library
- **React Router** 6.20.0 - Navigation
- **Axios** 1.6.2 - HTTP client
- **Vite** 5.0.8 - Build tool

### Backend
- **Node.js** v18+ - Runtime (ES Modules)
- **Express** 4.18.2 - Web framework
- **MongoDB** - Database (via Atlas)
- **Mongoose** 8.0.0 - ODM

### AI Provider
- **Google Gemini** 2.0 Flash - FREE AI (no credit card)
- **@google/generative-ai** 0.1.1 - SDK
- **Rate Limit**: 15 requests/minute

### Email Solution
- **IMAP** - Gmail inbox monitoring
- **Nodemailer** 6.9.7 - SMTP sending
- **mailparser** 3.6.5 - Email parsing

### Key Libraries
- **pdf-parse** 2.x - PDF extraction
- **mammoth** 1.6.0 - Word (.docx/.doc)
- **xlsx** 0.18.5 - Excel spreadsheets
- **tesseract.js** 5.0.0 - OCR for images

---

## 3. API Documentation

### Base URL
```
http://localhost:5000/api
```

### RFP Endpoints

#### Create RFP from Natural Language
```http
POST /api/rfps/create
Content-Type: application/json

Request Body:
{
  "naturalLanguageText": "We need 40 laptops with 16GB RAM, budget $120,000, delivery in 3 weeks..."
}

Success Response (201):
{
  "message": "RFP created successfully",
  "rfp": {
    "_id": "6789...",
    "title": "IT Equipment Upgrade",
    "requirements": [{"item": "Laptops", "quantity": 40, ...}],
    "budget": 120000,
    "status": "draft"
  }
}

Error Response (400):
{
  "message": "Failed to parse RFP",
  "error": "AI could not extract requirements"
}
```

#### Get All RFPs
```http
GET /api/rfps

Success Response (200):
[
  {
    "_id": "6789...",
    "title": "IT Equipment Upgrade",
    "status": "sent",
    "budget": 120000,
    "createdAt": "2025-12-04T10:30:00Z"
  }
]
```

#### Send RFP to Vendors
```http
POST /api/rfps/:id/send
Content-Type: application/json

Request Body:
{
  "vendorIds": ["vendor123", "vendor456"]
}

Success Response (200):
{
  "message": "RFP sent successfully to 2 vendor(s)",
  "emailResults": [...]
}
```

### Vendor Endpoints

#### Create Vendor
```http
POST /api/vendors
Content-Type: application/json

Request Body:
{
  "name": "TechPro Systems",
  "email": "vendor@example.com",
  "contactPerson": "John Doe",
  "phone": "+1-234-567-8900"
}

Success Response (201):
{
  "_id": "vendor123",
  "name": "TechPro Systems",
  ...
}

Error Response (400):
{
  "message": "Vendor with this email already exists"
}
```

#### Get All Vendors
```http
GET /api/vendors

Success Response (200):
[
  {"_id": "vendor123", "name": "TechPro Systems", ...}
]
```

### Proposal Endpoints

#### Get Proposals for RFP
```http
GET /api/proposals/rfp/:rfpId

Success Response (200):
[
  {
    "_id": "proposal123",
    "vendor": {"name": "TechPro Systems", ...},
    "totalPrice": 70650,
    "deliveryTime": "15 business days",
    "score": 92,
    "aiEvaluation": {
      "strengths": ["Excellent warranty", ...],
      "weaknesses": [...]
    }
  }
]
```

#### Evaluate Proposals with AI
```http
POST /api/proposals/evaluate/:rfpId

Success Response (200):
{
  "message": "Proposals evaluated successfully",
  "evaluation": {
    "recommendedVendor": "TechPro Systems",
    "reasoning": "Best balance of price and quality"
  },
  "proposals": [...]
}

Error Response (400):
{
  "message": "No proposals found for this RFP"
}
```

### Conversation Endpoints

#### Get Pending Conversations
```http
GET /api/conversations/:rfpId

Success Response (200):
[
  {
    "_id": "conv123",
    "vendor": {"name": "TechPro", ...},
    "emailContent": "Thank you for...",
    "status": "pending_review"
  }
]
```

#### Accept Conversation (Triggers AI Evaluation)
```http
POST /api/conversations/:conversationId/accept

Success Response (200):
{
  "message": "Conversation accepted and converted to proposal",
  "proposal": {...}
}
```

### Email Monitoring

#### Manual Email Check
```http
POST /api/proposals/check-emails

Success Response (200):
{
  "message": "Email check completed",
  "newEmails": 2
}
```

---

## 4. Decisions & Assumptions

### Key Design Decisions

**1. Two-Stage Approval Workflow (Conversation → Proposal)**
- **Decision**: Vendor responses first appear as "Conversations" requiring manual acceptance before AI evaluation
- **Reason**: Not all emails in the same thread contain actual proposals - some may be acknowledgments, questions, or clarifications without pricing. Manual review ensures only genuine proposals with pricing details are accepted for AI evaluation. This prevents wasting AI API calls on spam/irrelevant emails, gives users control, and works within rate limits

**2. MongoDB with Mongoose Relationships**
- **Decision**: Use MongoDB with referenced relationships (not embedded)
- **Reason**: RFPs are document-like with flexible structure; relationships maintain data consistency; MongoDB Atlas has free tier

**3. Direct Gmail Integration (IMAP + SMTP)**
- **Decision**: Use native IMAP for receiving, Nodemailer for sending
- **Reason**: No third-party dependency; free; reliable; polls every 5 minutes automatically

**4. Multi-Format Document Extraction**
- **Decision**: Support PDF, Word, Excel, and images with OCR
- **Reason**: Real-world vendors send proposals in various formats; automatic extraction eliminates manual data entry

**5. Context-Aware AI Prompting**
- **Decision**: Include RFP requirements when parsing vendor responses
- **Reason**: Improves AI accuracy; validates vendor compliance; provides better evaluation

**6. Weighted Scoring Algorithm**
- **Decision**: Price (40%), Compliance (30%), Terms (30%)
- **Reason**: Price is primary in procurement; compliance ensures requirements met; terms matter for business


**7. Google Gemini 2.0 Flash over OpenAI**
- **Decision**: Use Google Gemini instead of OpenAI GPT models
- **Reason**: Completely free with no credit card required (15 req/min, 1,500 req/day); sufficient for prototype and demo; reliable JSON output; fast response times (~2-3 seconds)

### Assumptions Made

**Business Assumptions:**
- Single organization use (no multi-tenancy needed)
- Trusted internal users (no authentication required per requirements)
- Vendors respond from registered email addresses
- Professional vendor responses with extractable data

**Technical Assumptions:**
- English language for all RFPs and responses
- Vendors either reply to the same email thread OR include RFP ID in subject line if sending new email
- Stable internet connection for API calls
- Gmail IMAP/SMTP accessible (not blocked)
- Google Gemini free tier (15 req/min) sufficient for usage

**Data Assumptions:**
- RFPs have identifiable components (items, budget, deadline)
- Vendor responses contain pricing and terms
- Budget values in USD
- Document attachments in common formats (PDF, Word, Excel, Images)

**Operational Assumptions:**
- 5-minute email polling acceptable (not real-time required)
- Moderate RFP volume (not thousands per day)
- One-time evaluation per RFP
- Users review and accept proposals manually
- Frontend stays open in browser for auto-refresh to work (30s polling)

**Email Processing Assumptions:**
- Vendors either reply to original RFP email (maintaining thread) OR send new email with RFP ID in subject line
- RFP ID extraction from subject line works reliably for automatic proposal linking
- Email attachments are actual proposal documents (not spam/unrelated files)
- Vendors send proposals within reasonable timeframe after receiving RFP
- Only emails from registered vendors are processed (security measure)

**AI Processing Assumptions:**
- Gemini AI can reliably extract structured data from natural language
- AI handles various vendor writing styles and formats
- Occasional parsing errors are acceptable (fallback mechanisms in place)
- JSON cleaning handles common AI output issues (trailing commas, code blocks)
- Context-aware prompting (including RFP details) improves accuracy

---

## 5. AI Tools Usage

### Tools Used

**Primary Tools:**
- **GitHub Copilot** - Integrated in VS Code for real-time code completion
- **Claude 3.5 Sonnet** - Via VS Code extension for complex problem-solving
- **ChatGPT (GPT-4)** - Web interface for quick searches and alternatives

### What They Helped With

**1. Boilerplate Code (30% faster)**
- Express server setup with middleware, routes, error handling
- React component scaffolding with hooks (useState, useEffect)
- Mongoose schemas with validation and relationships
- Package.json dependencies and scripts

**2. API Design**
- RESTful endpoint structure and naming conventions
- Request/response JSON formats
- Error handling patterns with proper HTTP status codes
- Middleware chain organization

**3. Prompt Engineering for Gemini AI** (Most Critical)
- Structured output prompts for consistent JSON responses
- Context injection (including RFP requirements when parsing responses)
- Error recovery for malformed JSON
- Example-based learning in prompts

**4. Document Extraction**
- Debugged pdf-parse v2 API changes (class instantiation vs function)
- Discovered mammoth library for Word extraction
- Implemented multi-sheet Excel parsing with xlsx
- Integrated tesseract.js for OCR

**5. Debugging**
- Fixed Mongoose validation errors (status enum)
- Resolved CORS configuration issues
- CommonJS/ESM compatibility (pdf-parse with createRequire)
- JSON parsing errors from AI (trailing commas, code blocks)

**6. Documentation**
- README structure and content organization
- API documentation with examples
- Test scenario creation

### Notable Prompts & Approaches

#### Internal AI Prompts Used in Code

**1. RFP Creation Prompt** (`ai.service.js` - `parseRFPFromText`)
- **Purpose**: Converts natural language procurement requests into structured JSON
- **Why**: Allows users to describe needs in plain English instead of filling complex forms
- **Key Features**:
  - Extracts: title, description, requirements array, budget, delivery deadline, payment terms, warranty
  - Requests pure JSON output (no markdown formatting)
  - Handles date calculations ("within 3 weeks" → ISO date)
- **Example Input**: "We need 40 laptops with 16GB RAM, budget $120,000, delivery in 3 weeks"
- **Output**: Structured RFP with all fields properly formatted

**2. Vendor Response Parsing Prompt** (`ai.service.js` - `parseVendorResponse`)
- **Purpose**: Extracts structured proposal data from vendor emails
- **Why**: Vendors send unstructured emails; need to extract pricing, terms, warranty automatically
- **Key Features**:
  - **Mandatory fields**: items array, totalCost, deliveryTimeline, paymentTerms, warranty
  - **Detailed item extraction**: description, quantity, unitPrice, totalPrice, specifications
  - **Fallback mechanisms**: 
    - Regex extraction if AI misses total cost
    - Calculates total from items if not found
    - Default values for missing fields
  - **Robust JSON cleaning**: Removes trailing commas, extracts JSON from mixed content
- **Why Detailed**: Real vendor emails are messy - need explicit instructions for reliable extraction

**3. Proposal Evaluation Prompt** (`ai.service.js` - `evaluateProposals`)
- **Purpose**: Scores and compares multiple vendor proposals
- **Why**: Objective AI analysis helps identify best vendor based on multiple criteria
- **Scoring Criteria**:
  - **Price Competitiveness (40%)**: How close to budget, value for money
  - **Requirement Compliance (30%)**: Meets all RFP specifications
  - **Terms Favorability (30%)**: Payment terms, warranty, delivery speed
- **Output**: Score (0-100), strengths array, weaknesses array, recommendation text, overall winner

#### Design Patterns in Prompts

**Pattern 1: Explicit Structure Specification**
- Always define exact JSON structure with examples
- Reason: Prevents AI from improvising field names or formats

**Pattern 2: "Return ONLY valid JSON" Instruction**
- Repeated in all prompts to avoid markdown code blocks
- Reason: Gemini sometimes wraps JSON in \`\`\`json blocks; this reduces that behavior

**Pattern 3: Fallback Extraction**
- Regex patterns for critical fields (totalCost)
- Reason: If AI fails, don't lose the proposal - extract what we can

**Pattern 4: Context Injection**
- Include RFP requirements when parsing vendor responses (commented out in current version)
- Reason: AI can validate compliance and flag missing items

#### Prompts Used During Development (with AI assistants)

**Prompt for Two-Stage Workflow:**
```
"Should I auto-evaluate vendor responses immediately or require manual approval first?"
→ AI suggested two-stage workflow for cost efficiency and user control
```

**Debugging Prompt:**
```
"Getting 'PDFParse is not a constructor' error with pdf-parse v2"
→ AI: "Use `new PDFParse({ data: buffer })` - v2 changed to class API"
```

**Architecture Prompt:**
```
"Design RESTful API endpoints for RFP management system with conversation approval workflow"
→ AI suggested proper HTTP methods, status codes, and endpoint structure
```

### What I Learned

**AI Strengths:**
- Excellent for boilerplate and repetitive code patterns
- Quick at suggesting best practices and libraries
- Great for debugging common errors
- Speeds up documentation writing significantly

**AI Limitations:**
- Business logic requires human judgment (workflow design, scoring weights)
- Architecture decisions need human understanding of tradeoffs
- Generated code always needs testing and validation
- Context windows limit how much code AI can see at once

**What Changed Because of AI:**
- **Originally planned**: Simple one-stage proposal acceptance
- **AI suggested**: Two-stage workflow for better cost efficiency
- **Result**: More production-ready system with better resource management

**Productivity Impact:**
- Estimated 30-40% faster development
- Saved ~15-20 hours on a 40-hour project
- Discovered libraries I wouldn't have found quickly (tesseract.js, mammoth)
- Higher code consistency from following AI patterns

**Best Practices Learned:**
1. Start with specific prompts including error messages and context
2. Use AI for patterns, human brain for decisions
3. Always test and validate AI-generated code
4. Iterate on prompts for better results
5. Combine multiple AI tools for different strengths

---

**Built with passion and AI assistance for the Hackathon Challenge** 🚀

*This project demonstrates modern full-stack development with thoughtful AI integration, comprehensive documentation, and production-ready architecture.*
