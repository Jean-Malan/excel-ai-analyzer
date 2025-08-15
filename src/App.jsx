import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import components
import Navigation from './components/Navigation';
import TutorialModal from './components/TutorialModal';

// Import pages
import Home from './pages/Home';
import ExcelAnalysis from './pages/ExcelAnalysis';
import SqlAnalysis from './pages/SqlAnalysis';

const App = () => {
  // Tutorial modal
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-3 sm:p-6">
          <Navigation onShowTutorial={() => setShowTutorialModal(true)} />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/excel-analysis" element={<ExcelAnalysis />} />
            <Route path="/sql-analysis" element={<SqlAnalysis />} />
          </Routes>

          {/* Tutorial Modal - Global */}
          <TutorialModal
            isOpen={showTutorialModal}
            onClose={() => setShowTutorialModal(false)}
          />
        </div>
      </div>
    </Router>
  );
};

export default App;