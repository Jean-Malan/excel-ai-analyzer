import React, { useState } from 'react';
import { Settings, CheckCircle, HelpCircle, DollarSign, Brain } from 'lucide-react';

const Configuration = ({
  file,
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  headers,
  selectedInputColumns,
  onToggleColumnSelection,
  outputColumn,
  setOutputColumn,
  customOutputColumn,
  setCustomOutputColumn,
  analysisPrompt,
  setAnalysisPrompt
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCostTooltip, setShowCostTooltip] = useState(false);
  const [showApiKeyTooltip, setShowApiKeyTooltip] = useState(false);
  
  const getCostInfo = (model) => {
    const costs = {
      'gpt-4o-mini-2024-07-18': {
        name: '4o-mini',
        input: '$0.60',
        cached: '$0.30',
        output: '$2.40',
        description: 'Fastest processing speed'
      },
      'gpt-5-nano-2025-08-07': {
        name: 'GPT-5 Nano',
        input: '$0.05',
        cached: '$0.005',
        output: '$0.40',
        description: 'Most affordable option'
      },
      'gpt-5-mini-2025-08-07': {
        name: 'GPT-5 Mini',
        input: '$0.25',
        cached: '$0.025',
        output: '$2.00',
        description: 'Good value for quality'
      },
      'o4-mini-2025-04-16': {
        name: 'o4-mini',
        input: '$1.10',
        cached: '$0.275',
        output: '$4.40',
        description: 'Premium reasoning model'
      },
      'gpt-4.1-2025-04-14': {
        name: 'GPT-4.1',
        input: '$2.00',
        cached: '$0.50',
        output: '$8.00',
        description: 'Highest quality, highest cost'
      }
    };
    return costs[model];
  };
  
  if (!file) return null;

  return (
    <div className="space-y-4">
      {/* AI Configuration Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          2. AI Configuration
        </h2>
        
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <div className="flex items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                OpenAI API Key *
              </label>
              <div className="relative ml-2">
                <button
                  type="button"
                  onMouseEnter={() => setShowApiKeyTooltip(true)}
                  onMouseLeave={() => setShowApiKeyTooltip(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                
                {showApiKeyTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 w-80">
                    <div className="text-center">
                      <p className="font-medium mb-2">How to get your OpenAI API key:</p>
                      <div className="text-left space-y-1">
                        <p>1. Go to <span className="font-medium text-blue-300">platform.openai.com</span></p>
                        <p>2. Sign up or log in to your account</p>
                        <p>3. Click "API keys" in the left sidebar</p>
                        <p>4. Click "Create new secret key"</p>
                        <p>5. Copy the key that starts with "sk-"</p>
                      </div>
                      <p className="mt-2 text-gray-300">⚠️ Your key is run locally only and never stored or shared</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center text-sm text-green-700">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="font-medium">SECURE:</span>
                <span className="ml-1 text-xs">Your API key is only used locally in your browser and is NEVER stored, saved, or transmitted to any server other than OpenAI directly.</span>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="relative">
            <div className="flex items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                AI Model *
              </label>
              <div className="relative ml-2">
                <button
                  type="button"
                  onMouseEnter={() => setShowCostTooltip(true)}
                  onMouseLeave={() => setShowCostTooltip(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                </button>
                
                {showCostTooltip && (
                  <div className="ml-8 pl-8 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-20 w-96">
                    <div className="text-center">
                      <p className="font-medium mb-3">Pricing (per 1M tokens)</p>
                      <div className="space-y-3">
                        {['gpt-4o-mini-2024-07-18', 'gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'o4-mini-2025-04-16', 'gpt-4.1-2025-04-14'].map(model => {
                          const cost = getCostInfo(model);
                          return (
                            <div key={model} className={`p-2 rounded ${selectedModel === model ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                              <div className="font-medium text-sm">{cost.name}</div>
                              <div className="text-xs text-gray-300 mt-1">
                                Input: {cost.input} • Cached: {cost.cached} • Output: {cost.output}
                              </div>
                              <div className="text-xs text-gray-400 italic">{cost.description}</div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-gray-300 text-xs">Hover over $ to see pricing details</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="gpt-4o-mini-2024-07-18">4o-mini (Fastest)</option>
              <option value="gpt-5-nano-2025-08-07">GPT-5 Nano (Most Affordable)</option>
              <option value="gpt-5-mini-2025-08-07">GPT-5 Mini (Balanced)</option>
              <option value="o4-mini-2025-04-16">o4-mini (Advanced Reasoning)</option>
              <option value="gpt-4.1-2025-04-14">GPT-4.1 (Most Capable)</option>
            </select>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                Choose based on your needs • Currently selected: {getCostInfo(selectedModel).name}
              </p>
              <p className="text-xs text-green-600 font-medium">
                {getCostInfo(selectedModel).description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Selection Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Data Selection
        </h3>
        
        <div className="space-y-4">
          {/* Input Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Input Columns * (data to analyze)
              </label>
              <label className="flex items-center text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedInputColumns.length === headers.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Select all columns
                      headers.forEach((_, index) => {
                        if (!selectedInputColumns.includes(index)) {
                          onToggleColumnSelection(index);
                        }
                      });
                    } else {
                      // Deselect all columns
                      selectedInputColumns.forEach(index => {
                        onToggleColumnSelection(index);
                      });
                    }
                  }}
                  className="mr-2"
                />
                <span className="font-medium">Select All</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {headers.map((header, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedInputColumns.includes(index)}
                    onChange={() => onToggleColumnSelection(index)}
                    className="mr-2"
                  />
                  <span className="text-sm">{header || `Column ${index + 1}`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Output Column */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Column *
            </label>
            <select
              value={outputColumn}
              onChange={(e) => setOutputColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
            >
              <option value="">Select output column...</option>
              <option value="new">+ Create new column</option>
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  {header || `Column ${index + 1}`}
                </option>
              ))}
            </select>
            
            {outputColumn === 'new' && (
              <input
                type="text"
                value={customOutputColumn}
                onChange={(e) => setCustomOutputColumn(e.target.value)}
                placeholder="Enter column name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Analysis Instructions Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Analysis Instructions
        </h3>
        
        <div className="relative">
          <div className="flex items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Analysis Instructions *
            </label>
            <div className="relative ml-2">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 w-80">
                  <div className="text-center">
                    <p className="font-medium mb-2">What should I write here?</p>
                    <div className="text-left space-y-1">
                      <p>• <strong>Describe the task:</strong> "Analyze the sentiment of customer reviews"</p>
                      <p>• <strong>Specify format:</strong> "Return only: Positive, Negative, or Neutral"</p>
                      <p>• <strong>Give examples:</strong> "Extract key themes from feedback"</p>
                      <p>• <strong>Set context:</strong> "Score from 1-10 based on satisfaction"</p>
                    </div>
                    <p className="mt-2 text-gray-300">AI will analyze each row using your selected input columns and these instructions.</p>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
          <textarea
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            placeholder="Describe what analysis you want the AI to perform on each row... (hover the ? icon for examples)"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default Configuration;