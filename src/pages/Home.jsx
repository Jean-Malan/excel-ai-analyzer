import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const features = [
    {
      title: 'AI-Powered Analysis',
      description: 'Use OpenAI models to analyze your Excel data row by row with custom prompts.'
    },
    {
      title: 'Natural Language Queries',
      description: 'Ask questions in natural language and get insights to analyze your entire dataset.'
    },
    {
      title: 'Lightning Fast',
      description: 'Client-side processing means your data never leaves your browser.'
    },
    {
      title: 'Privacy First',
      description: 'Your API keys and data are stored locally. No server storage.'
    }
  ];

  const tools = [
    {
      title: 'Row-by-Row Analysis',
      description: 'Perfect for analyzing individual rows with AI. Great for sentiment analysis, categorization, and content generation.',
      link: '/excel-analysis',
      color: 'blue',
      examples: ['Sentiment analysis of customer feedback', 'Categorize products or leads', 'Translate text columns', 'Extract key information']
    },
    {
      title: 'Sheet Analysis',
      description: 'Ideal for finding patterns across your entire dataset. Ask questions and get instant insights.',
      link: '/sql-analysis',
      color: 'green',
      examples: ['Find duplicate records', 'Identify outliers and anomalies', 'Calculate statistics by category', 'Detect trends over time']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Excel AI Analyzer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Transform your Excel data with artificial intelligence. Upload your spreadsheets and get instant insights 
            through AI-powered analysis or natural language SQL queries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/excel-analysis"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              Start Row-by-Row Analysis
            </Link>
            <Link
              to="/sql-analysis"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              Try Sheet Analysis
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            return (
              <div key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Tools Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {tools.map((tool, index) => {
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
              green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            };

            return (
              <div key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="flex items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{tool.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">{tool.description}</p>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Perfect for:</h4>
                  <ul className="space-y-2">
                    {tool.examples.map((example, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-gray-600 text-sm">• {example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  to={tool.link}
                  className={`w-full bg-gradient-to-r ${colorClasses[tool.color]} text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center`}
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>

        {/* Getting Started */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Upload your Excel file, choose your AI model, and start analyzing your data in seconds. 
            Your API key stays in your browser for complete privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/excel-analysis"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center"
            >
              Row-by-Row Analysis
            </Link>
            <Link
              to="/sql-analysis"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center"
            >
              Dataset-Wide Insights
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;