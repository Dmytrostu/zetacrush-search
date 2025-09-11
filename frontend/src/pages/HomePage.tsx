import React from 'react';
import SearchBar from '../components/search/SearchBar';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';

const HomePage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header with our color scheme */}
      <header className="flex justify-end items-center p-4">
        <nav className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-zeta-gray-200 dark:hover:bg-zeta-gray-700"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-zeta-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-zeta-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
              </svg>
            )}
          </button>
        </nav>
      </header>
      
      {/* Main content - centered logo and search */}
      <main className="flex-grow flex flex-col items-center justify-center -mt-16">
        <div className="mb-8 transform hover:scale-105 transition-all duration-300">
          <h1 className={`text-6xl font-bold ${theme === 'dark' ? 'text-zeta-white' : 'text-zeta-gray-800'}`}>
            <span className="text-zeta-gray-400">Z</span>
            <span className="text-zeta-gray-500">e</span>
            <span className="text-zeta-gray-600">t</span>
            <span className="text-zeta-gray-700">a</span>
            <span className="text-zeta-gray-800">C</span>
            <span className="text-zeta-gray-700">r</span>
            <span className="text-zeta-gray-600">u</span>
            <span className="text-zeta-gray-500">s</span>
            <span className="text-zeta-gray-400">h</span>
          </h1>
        </div>
        <div className="w-full max-w-2xl px-4 transform hover:scale-102 transition-transform duration-300">
          <SearchBar isHomePage={true} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;