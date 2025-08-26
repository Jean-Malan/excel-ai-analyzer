import React, { useState } from 'react';
import { Search, ArrowRight, Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

const CleanSemanticConfig = ({
  showSemanticConfig,
  setShowSemanticConfig,
  semanticConfig,
  setSemanticConfig,
  headers,
  schema
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasConfiguration = semanticConfig.searchColumns?.length > 0 || semanticConfig.returnColumns?.length > 0;

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <button
        onClick={() => setShowSemanticConfig(!showSemanticConfig)}
        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
          showSemanticConfig 
            ? 'bg-blue-50 border-blue-200 text-blue-900' 
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <Search className="w-4 h-4 mr-3" />
          <div className="text-left">
            <span className="font-medium">Semantic Search</span>
            {hasConfiguration && (
              <div className="text-xs text-gray-500 mt-0.5">
                {semanticConfig.searchColumns?.length || 0} search columns, {semanticConfig.returnColumns?.length || 0} return columns
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {showSemanticConfig && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-2">
              Active
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showSemanticConfig ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Configuration Panel */}
      {showSemanticConfig && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          
          {/* Quick Setup */}
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Quick Setup</h4>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const textColumns = headers.filter((_, i) => 
                    schema[i] && schema[i].type === 'TEXT'
                  );
                  setSemanticConfig(prev => ({
                    ...prev,
                    searchColumns: textColumns.length > 0 ? textColumns : headers.slice(0, 3),
                    returnColumns: [...headers]
                  }));
                }}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
              >
                Text Columns
              </button>
              <button
                onClick={() => {
                  setSemanticConfig(prev => ({
                    ...prev,
                    searchColumns: headers.slice(0, 3),
                    returnColumns: [...headers]
                  }));
                }}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
              >
                First 3 Columns
              </button>
              <button
                onClick={() => {
                  setSemanticConfig(prev => ({
                    ...prev,
                    searchColumns: [],
                    returnColumns: []
                  }));
                }}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Column Selection */}
          <div className="space-y-4">
            
            {/* Search Columns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search In
              </label>
              <MultiSelectDropdown
                placeholder="Choose columns to analyze..."
                options={headers}
                value={semanticConfig.searchColumns}
                onChange={(selectedColumns) => {
                  setSemanticConfig(prev => ({
                    ...prev,
                    searchColumns: selectedColumns
                  }));
                }}
                theme="default"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setSemanticConfig(prev => ({ ...prev, searchColumns: [...headers] }))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSemanticConfig(prev => ({ ...prev, searchColumns: [] }))}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Return Columns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Results
              </label>
              <MultiSelectDropdown
                placeholder="Choose columns to return..."
                options={headers}
                value={semanticConfig.returnColumns}
                onChange={(selectedColumns) => {
                  setSemanticConfig(prev => ({
                    ...prev,
                    returnColumns: selectedColumns
                  }));
                }}
                theme="default"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setSemanticConfig(prev => ({ ...prev, returnColumns: [...headers] }))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSemanticConfig(prev => ({ ...prev, returnColumns: [] }))}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-3"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Settings
              {showAdvanced ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                
                {/* Confidence Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Confidence: {Math.round(semanticConfig.minConfidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={semanticConfig.minConfidence}
                    onChange={(e) => setSemanticConfig(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50%</span>
                    <span>95%</span>
                  </div>
                </div>

                {/* Include Confidence */}
                <div>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={semanticConfig.includeConfidence}
                      onChange={(e) => setSemanticConfig(prev => ({ ...prev, includeConfidence: e.target.checked }))}
                      className="mt-1 mr-3 accent-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Show Confidence Scores
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Include match confidence and reasoning in results
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanSemanticConfig;