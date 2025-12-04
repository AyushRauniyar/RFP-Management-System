import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreateRFP from './pages/CreateRFP';
import Vendors from './pages/Vendors';
import SendRFP from './pages/SendRFP';
import Compare from './pages/Compare';
import ConversationReview from './pages/ConversationReview';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        {/* Navigation */}
        <nav className="navbar">
          <div className="logo-container">
            <div className="logo-icon">🎯</div>
            <div className="logo-text">
              <h1 className="logo">RFP Management System</h1>
              <p className="logo-subtitle">AI-Powered Procurement Platform</p>
            </div>
          </div>
          <ul className="nav-links">
            <li><Link to="/" className="nav-link">📊 Dashboard</Link></li>
            <li><Link to="/create-rfp" className="nav-link">➕ Create RFP</Link></li>
            <li><Link to="/vendors" className="nav-link">🏢 Vendors</Link></li>
          </ul>
        </nav>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-rfp" element={<CreateRFP />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/send-rfp/:id" element={<SendRFP />} />
            <Route path="/compare/:id" element={<Compare />} />
            <Route path="/conversations/:rfpId" element={<ConversationReview />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
