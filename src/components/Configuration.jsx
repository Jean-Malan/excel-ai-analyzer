import React, { useState } from 'react';
import { Settings, CheckCircle, HelpCircle } from 'lucide-react';

const Configuration = ({
  file,
  apiKey,
  setApiKey,
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
  
  if (!file) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Settings className="w-5 h-5 mr-2" />
        2. Configuration
      </h2>
      
      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key *
          </label>
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

        {/* Input Columns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Input Columns * (data to analyze)
          </label>
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
            <option value="new">Create new column</option>
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

        {/* Analysis Prompt */}
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