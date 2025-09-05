import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchContextProvider } from './context/SearchContext';
import { ThemeContextProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <ThemeContextProvider>
      <SearchContextProvider>
        <Router>
          <main className="min-h-screen" style={{ padding: '0'}}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </Router>
      </SearchContextProvider>
    </ThemeContextProvider>
  );
}

export default App;