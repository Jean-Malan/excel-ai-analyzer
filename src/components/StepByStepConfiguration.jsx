import React, { useState } from 'react';
import { ChevronRight, Key, Shield, Database, Target, List, MessageSquare, Upload, Check } from 'lucide-react';
import CategoryConfiguration from './CategoryConfiguration';

// Export just the navigation part
export const StepNavigation = ({
  file,
  apiKey,
  selectedInputColumns,
  outputColumn,
  analysisPrompt,
  dynamicCategoryOptions,
  activePanel,
  setActivePanel
}) => {
  const panels = [
    { 
      id: 1, 
      title: "Upload File", 
      icon: Upload, 
      completed: !!file
    },
    { 
      id: 2, 
      title: "API Keys", 
      icon: Key, 
      completed: !!apiKey
    },
    { 
      id: 3, 
      title: "Input Columns", 
      icon: Database, 
      completed: selectedInputColumns.length > 0
    },
    { 
      id: 4, 
      title: "Output Column", 
      icon: Target, 
      completed: !!outputColumn
    },
    { 
      id: 5, 
      title: "Categories", 
      icon: List, 
      completed: dynamicCategoryOptions?.enabled || false // Only completed if user has configured categories
    },
    { 
      id: 6, 
      title: "Analysis", 
      icon: MessageSquare, 
      completed: !!analysisPrompt
    }
  ];

  return (
    <div className="card p-5">
      <h2 className="mb-4">Setup Progress</h2>
      <div className="space-y-3">
        {panels.map((panel) => {
          const Icon = panel.icon;
          const isActive = activePanel === panel.id;
          const isCompleted = panel.completed;
          
          return (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              disabled={!file && panel.id > 1}
              className={`w-full flex items-center p-3 rounded-lg border text-left transition-colors ${
                isActive 
                  ? 'bg-neutral-100 border-neutral-300' 
                  : isCompleted
                  ? 'bg-white border-neutral-200'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50'
              } ${!file && panel.id > 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 bg-neutral-100`}>
                {isCompleted ? (<Check className="w-4 h-4 text-neutral-700" />) : (<Icon className="w-4 h-4 text-neutral-600" />)}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium`}>
                  {panel.id}. {panel.title}
                </div>
                <div className="text-xs muted mt-0.5">
                  {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
                </div>
              </div>
              {isActive && (<ChevronRight className="w-4 h-4 text-neutral-700" />)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Export the panel content part  
const StepByStepConfiguration = ({
  // File props (handled elsewhere)
  file,
  // API Key props  
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  // Column props
  selectedInputColumns,
  setSelectedInputColumns,
  outputColumn,
  setOutputColumn,
  customOutputColumn,
  setCustomOutputColumn,
  // Analysis props
  analysisPrompt,
  setAnalysisPrompt,
  // Category props
  dynamicCategoryOptions,
  onDynamicCategoryChange,
  // Other props
  headers,
  currentStep,
  setCurrentStep,
  onStartProcessing,
  // Panel state
  activePanel = 2,
  setActivePanel
}) => {

  const availableModels = [
    { id: 'gpt-4o-mini-2024-07-18', name: '4o-mini (Fastest)', cost: '$0.60/1M' },
    { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano (Most Affordable)', cost: '$0.05/1M' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini (Balanced)', cost: '$0.25/1M' },
    { id: 'o4-mini-2025-04-16', name: 'o4-mini (Advanced Reasoning)', cost: '$1.10/1M' },
    { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1 (Most Capable)', cost: '$2.00/1M' }
  ];

  const panels = [
    { 
      id: 1, 
      title: "Upload File", 
      icon: Upload, 
      completed: !!file
    },
    { 
      id: 2, 
      title: "API Keys", 
      icon: Key, 
      completed: !!apiKey
    },
    { 
      id: 3, 
      title: "Input Columns", 
      icon: Database, 
      completed: selectedInputColumns.length > 0
    },
    { 
      id: 4, 
      title: "Output Column", 
      icon: Target, 
      completed: !!outputColumn
    },
    { 
      id: 5, 
      title: "Categories", 
      icon: List, 
      completed: true // Always completed since optional
    },
    { 
      id: 6, 
      title: "Analysis", 
      icon: MessageSquare, 
      completed: !!analysisPrompt
    }
  ];

  const canProceedToNext = (panelId) => {
    switch(panelId) {
      case 2: return !!file;
      case 3: return !!apiKey;
      case 4: return selectedInputColumns.length > 0;
      case 5: return !!outputColumn;
      case 6: return true; // Category is optional
      default: return false;
    }
  };

  const allRequiredCompleted = apiKey && selectedInputColumns.length > 0 && outputColumn && analysisPrompt;

  return (
    <div className="space-y-6">

      {/* Panel 1: File Upload (handled elsewhere, just show status) */}
      {activePanel === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Upload className="w-5 h-5 text-gray-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Upload Your File</h3>
          </div>
          {file ? (
            <div className="flex items-center text-green-600">
              <Check className="w-4 h-4 mr-2" />
              <span>File uploaded successfully: {file.name}</span>
            </div>
          ) : (
            <p className="text-gray-600">Please upload an Excel file to continue.</p>
          )}
        </div>
      )}

      {/* Panel 2: API Configuration */}
      {activePanel === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Key className="w-5 h-5 text-gray-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">API Configuration</h3>
          </div>
          
          <div className="space-y-4">
            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <Shield className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">Secure & Private</h4>
                <p className="text-sm text-green-700">
                  Your API key is stored securely in your browser only. It's never sent to our servers.
                </p>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key *
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">OpenAI Platform</a>
              </p>
            </div>

            {/* Model Selection */}
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
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.cost}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                GPT-4o Mini is recommended - it's faster and more cost-effective for most tasks.
              </p>
            </div>

            {/* Continue Button */}
            {apiKey && (
              <button
                onClick={() => setActivePanel(3)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                Continue to Column Selection
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel 3: Input Columns */}
      {activePanel === 3 && canProceedToNext(3) && (
        <div className="card p-5">
          <div className="flex items-center mb-4">
            <Database className="w-4 h-4 text-neutral-700 mr-2" />
            <h3>Select Input Columns</h3>
          </div>
          
          <div className="space-y-4">
            <p className="muted">Choose which columns contain the data you want to analyze.</p>
            
            <div className="max-h-64 overflow-y-auto border border-neutral-200 rounded-lg p-4">
              <div className="space-y-3">
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
                      className="mr-3 accent-blue-500"
                    />
                    <span className="text-sm text-neutral-800">{header || `Column ${index + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button onClick={() => setSelectedInputColumns([...Array(headers.length).keys()])} className="btn">
                Select All
              </button>
              <button onClick={() => setSelectedInputColumns([])} className="btn">
                Clear All
              </button>
            </div>

            {selectedInputColumns.length > 0 && (
              <div className="pt-4">
                <p className="text-sm text-neutral-700 mb-3">
                  ✓ Selected {selectedInputColumns.length} column{selectedInputColumns.length !== 1 ? 's' : ''} for analysis
                </p>
                <button onClick={() => setActivePanel(4)} className="btn-primary w-full flex items-center justify-center">
                  Continue to Output Column
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel 4: Output Column */}
      {activePanel === 4 && canProceedToNext(4) && (
        <div className="card p-5">
          <div className="flex items-center mb-4">
            <Target className="w-4 h-4 text-neutral-700 mr-2" />
            <h3>Choose Output Column</h3>
          </div>
          
          <div className="space-y-4">
            <p className="muted">Where should the AI analysis results be placed?</p>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Output Destination
              </label>
              <select
                value={outputColumn}
                onChange={(e) => setOutputColumn(e.target.value)}
                className="field"
              >
                <option value="">Select destination...</option>
                <option value="new">Create new column</option>
                {headers.map((header, index) => (
                  <option key={index} value={index}>
                    Replace: {header || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {outputColumn === 'new' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  New Column Name
                </label>
                <input
                  type="text"
                  value={customOutputColumn}
                  onChange={(e) => setCustomOutputColumn(e.target.value)}
                  placeholder="e.g., AI Analysis, Category, Sentiment"
                  className="field"
                />
              </div>
            )}

            {outputColumn && (
              <button onClick={() => setActivePanel(5)} className="btn-primary w-full flex items-center justify-center">
                Continue to Categories
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel 5: Category Analysis */}
      {activePanel === 5 && canProceedToNext(5) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <List className="w-4 h-4 text-neutral-700 mr-2" />
              <div>
                <h3>Category Analysis</h3>
                <p className="text-sm muted">Configure categories for your data (optional)</p>
              </div>
            </div>
            <button
              onClick={() => setActivePanel(6)}
              className="btn-ghost text-sm"
            >
              Skip →
            </button>
          </div>
          
          <CategoryConfiguration
            dynamicCategoryOptions={dynamicCategoryOptions}
            onDynamicCategoryChange={onDynamicCategoryChange}
            analysisPrompt={analysisPrompt}
            setAnalysisPrompt={setAnalysisPrompt}
          />

          <div className="mt-4 pt-4 border-t border-neutral-200">
            <button
              onClick={() => setActivePanel(6)}
              className="btn-primary w-full flex items-center justify-center"
            >
              Continue to Analysis Prompt
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Panel 6: Analysis Prompt & Submit */}
      {activePanel === 6 && canProceedToNext(6) && (
        <div className="card p-5">
          <div className="flex items-center mb-4">
            <MessageSquare className="w-4 h-4 text-neutral-700 mr-2" />
            <h3>Analysis Instructions</h3>
          </div>
          
          <div className="space-y-4">
            <p className="muted">Tell the AI what kind of analysis you want to perform on your data.</p>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                What should the AI analyze? *
              </label>
              <textarea
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                placeholder="e.g., Find duplicate emails, Categorize feedback as positive/negative/neutral, Extract key insights from comments..."
                rows={4}
                className="field"
              />
            </div>

            {/* Quick Examples */}
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAnalysisPrompt("Find all duplicate emails")} className="btn-pill">
                  Find duplicates
                </button>
                <button onClick={() => setAnalysisPrompt("Categorize this data into meaningful groups")} className="btn-pill">
                  Categorize
                </button>
                <button onClick={() => setAnalysisPrompt("Extract key insights and patterns")} className="btn-pill">
                  Extract insights
                </button>
              </div>
            </div>

            {/* Final Submit */}
            {allRequiredCompleted ? (
              <div className="pt-4 border-t border-neutral-200">
                <div className="card-muted p-4 mb-4">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-neutral-700" />
                    <span className="font-medium">Ready to analyze!</span>
                  </div>
                  <p className="text-sm muted mt-1">
                    All required fields completed. Click below to start processing your data.
                  </p>
                </div>
                <button onClick={() => { setCurrentStep(3); onStartProcessing(); }} className="btn-primary w-full flex items-center justify-center py-3">
                  Start AI Analysis
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-neutral-200">
                <div className="text-center muted">
                  <p className="text-sm">Please complete all required fields to continue</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepByStepConfiguration;
