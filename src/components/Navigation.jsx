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
    <nav className="card px-4 sm:px-6 py-3 mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-neutral-900" aria-hidden />
          <div>
            <div className="text-base sm:text-lg font-semibold">Excel AI Analyzer</div>
            <div className="hidden sm:block text-xs muted">Minimal, focused spreadsheets + AI</div>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'bg-neutral-100' : ''}`
              }
              title={item.description}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `btn-ghost ${isActive ? 'bg-neutral-100' : ''}`}
              title={item.label}
            >
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <button onClick={onShowTutorial} className="btn" title="How to use this tool">
          Help
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
