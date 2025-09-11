import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchProvider } from './context/SearchContext';
import { ThemeContextProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <ThemeContextProvider>
      <Router>
        <SearchProvider>
          <main className="min-h-screen" style={{ padding: '0'}}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </SearchProvider>
      </Router>
    </ThemeContextProvider>
  );
}

export default App;