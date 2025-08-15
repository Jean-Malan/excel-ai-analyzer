import React from 'react';
import { NavLink } from 'react-router-dom';
import { Brain, Database, Home, HelpCircle } from 'lucide-react';

const Navigation = ({ onShowTutorial }) => {
  const navItems = [
    {
      to: '/',
      icon: Home,
      label: 'Home',
      description: 'Welcome page'
    },
    {
      to: '/excel-analysis',
      icon: Brain,
      label: 'Row-by-Row Analysis',
      description: 'AI-powered row-by-row analysis'
    },
    {
      to: '/sql-analysis',
      icon: Database,
      label: 'Sheet Analysis',
      description: 'Natural language queries on your data'
    }
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-6 py-4 shadow-sm mb-8">
      <div className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Excel AI Analyzer</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Intelligent data analysis tools</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`
                }
                title={item.description}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `p-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`
                }
                title={item.label}
              >
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Help Button */}
        <button
          onClick={onShowTutorial}
          className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md ml-4"
          title="How to use this tool"
        >
          <span>Help</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;