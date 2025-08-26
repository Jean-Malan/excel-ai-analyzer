import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, Key, MessageSquare } from 'lucide-react';

const SimpleConfiguration = ({
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  selectedInputColumns,
  setSelectedInputColumns,
  outputColumn,
  setOutputColumn,
  customOutputColumn,
  setCustomOutputColumn,
  analysisPrompt,
  setAnalysisPrompt,
  headers,
  currentStep,
  setCurrentStep,
  dynamicCategoryOptions,
  onDynamicCategoryChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableModels = [
    { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini (Recommended)', cost: '$0.60/M' },
    { value: 'gpt-4o-2024-08-06', label: 'GPT-4o', cost: '$2.50/M' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: '$10/M' }
  ];

  const canProceed = apiKey && selectedInputColumns.length > 0 && outputColumn && analysisPrompt;

  return (
    <div className="space-y-6">
      {/* Step 2: Configure Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <Settings className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Configure Analysis</h2>
        </div>

        <div className="space-y-6">
          {/* API Key - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4 inline mr-2" />
              OpenAI API Key *
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {!apiKey && (
              <p className="mt-1 text-sm text-gray-500">
                Required for AI analysis. Get your key from OpenAI.
              </p>
            )}
          </div>

          {/* Column Selection - Required */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Columns * (Select data to analyze)
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {headers.map((header, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedInputColumns.includes(index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInputColumns([...selectedInputColumns, index]);
                        } else {
                          setSelectedInputColumns(selectedInputColumns.filter(col => col !== index));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{header || `Column ${index + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Column * (Where to put results)
              </label>
              <select
                value={outputColumn}
                onChange={(e) => setOutputColumn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select column...</option>
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
                  placeholder="New column name"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          </div>

          {/* Analysis Prompt - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              What should AI analyze? *
            </label>
            <textarea
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              placeholder="e.g., Find all duplicate emails, Categorize the feedback as positive/negative/neutral, Extract key insights from the comments..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setAnalysisPrompt("Find all duplicate emails")}
                className="text-xs text-blue-600 hover:text-blue-800 mr-4"
              >
                Find duplicates
              </button>
              <button
                type="button"
                onClick={() => setAnalysisPrompt("Categorize this data")}
                className="text-xs text-blue-600 hover:text-blue-800 mr-4"
              >
                Categorize
              </button>
              <button
                type="button"
                onClick={() => setAnalysisPrompt("Extract key insights")}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Extract insights
              </button>
            </div>
          </div>

          {/* Advanced Settings - Optional */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              {showAdvanced ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
              Advanced Settings (Optional)
            </button>
            
            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {availableModels.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label} - {model.cost}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    GPT-4o Mini is recommended for most tasks - faster and cheaper.
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* Continue Button */}
          <div className="pt-4 border-t border-gray-200">
            {canProceed ? (
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                Continue to Analysis
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">
                  Please complete all required fields:
                </div>
                <div className="text-xs text-gray-400">
                  {!apiKey && "• API Key required "}
                  {selectedInputColumns.length === 0 && "• Select input columns "}
                  {!outputColumn && "• Choose output column "}
                  {!analysisPrompt && "• Add analysis prompt "}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleConfiguration;