import React, { useState } from 'react';
import { Settings, CheckCircle, HelpCircle, DollarSign, Brain, Plus, Trash2, List, Eye, EyeOff, BarChart3, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

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
  setAnalysisPrompt,
  dynamicCategoryOptions,
  onDynamicCategoryChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCostTooltip, setShowCostTooltip] = useState(false);
  const [showApiKeyTooltip, setShowApiKeyTooltip] = useState(false);
  const [categoryList, setCategoryList] = useState(['']);
  const [useCategoryMode, setUseCategoryMode] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [allocationCriteria, setAllocationCriteria] = useState('');
  const [usePureDynamicMode, setUsePureDynamicMode] = useState(false);
  const [discoveredCategories, setDiscoveredCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [useDynamicCategories, setUseDynamicCategories] = useState(dynamicCategoryOptions?.enabled || false);
  const [showDynamicStats, setShowDynamicStats] = useState(false);
  const [dynamicCategoryStats, setDynamicCategoryStats] = useState(dynamicCategoryOptions?.stats || null);
  
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

  const addCategory = () => {
    if (newCategory.trim() && categoryList.filter(cat => cat.trim()).length < 100) {
      const validCategories = categoryList.filter(cat => cat.trim());
      
      // Check if input contains commas - split and add multiple categories
      if (newCategory.includes(',')) {
        const newCategories = newCategory
          .split(',')
          .map(cat => cat.trim())
          .filter(cat => cat.length > 0)
          .filter(cat => !validCategories.some(existing => existing.toLowerCase() === cat.toLowerCase())) // Remove duplicates
          .slice(0, 100 - validCategories.length); // Respect the 100 category limit
        
        setCategoryList([...validCategories, ...newCategories]);
      } else {
        const trimmedCategory = newCategory.trim();
        // Check for duplicates (case-insensitive)
        if (!validCategories.some(existing => existing.toLowerCase() === trimmedCategory.toLowerCase())) {
          setCategoryList([...validCategories, trimmedCategory]);
        }
      }
      
      setNewCategory('');
    }
  };

  const removeCategory = (indexToRemove) => {
    const validCategories = categoryList.filter(cat => cat.trim());
    const updated = validCategories.filter((_, i) => i !== indexToRemove);
    setCategoryList(updated);
  };


  const generateCategoryPrompt = () => {
    const validCategories = categoryList.filter(cat => cat.trim());
    if (validCategories.length === 0) return '';
    
    const criteriaText = allocationCriteria.trim() 
      ? `\n\nAllocation criteria: ${allocationCriteria}\n`
      : '\n';
    
    return `Based on the provided data, assign each row to the most appropriate category from this list:

${validCategories.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}${criteriaText}
Return only the category name exactly as listed above. Choose the single best match.`;
  };

  // Function to handle real-time category discovery updates
  const handleCategoryDiscovery = (update) => {
    if (update.newCategory && !discoveredCategories.includes(update.newCategory)) {
      setDiscoveredCategories(prev => [...prev, update.newCategory]);
    }
    if (update.allCategories) {
      setDiscoveredCategories(update.allCategories);
    }
    if (update.currentStats) {
      setDynamicCategoryStats(update.currentStats);
    }
  };

  const handleCategoryModeToggle = (enabled) => {
    setUseCategoryMode(enabled);
    if (enabled) {
      setAnalysisPrompt(generateCategoryPrompt());
    } else {
      setAnalysisPrompt('');
    }
  };

  // Update prompt when categories or criteria change in category mode
  React.useEffect(() => {
    if (useCategoryMode && !usePureDynamicMode) {
      setAnalysisPrompt(generateCategoryPrompt());
    }
    // Note: Pure Dynamic Mode manages its own prompt directly through the textarea
  }, [categoryList, useCategoryMode, allocationCriteria, usePureDynamicMode]);

  // Sync state with props when they change
  React.useEffect(() => {
    if (dynamicCategoryOptions?.enabled !== undefined) {
      setUseDynamicCategories(dynamicCategoryOptions.enabled);
    }
    if (dynamicCategoryOptions?.stats !== undefined) {
      setDynamicCategoryStats(dynamicCategoryOptions.stats);
    }
  }, [dynamicCategoryOptions]);

  // Update parent when dynamic category options change (but only when meaningful changes occur)
  React.useEffect(() => {
    if (onDynamicCategoryChange) {
      const validCategories = usePureDynamicMode ? [] : categoryList.filter(cat => cat.trim());
      onDynamicCategoryChange({
        enabled: useDynamicCategories,
        predefinedCategories: validCategories,
        useCategoryMode: useCategoryMode || usePureDynamicMode, // Either mode counts as "category mode" for processing
        usePureDynamicMode,
        discoveredCategories,
        stats: dynamicCategoryStats,
        onCategoryDiscovery: handleCategoryDiscovery
      });
    }
  }, [useDynamicCategories, useCategoryMode, usePureDynamicMode, discoveredCategories, dynamicCategoryStats]);

  // Separate effect for categoryList changes to avoid frequent updates
  React.useEffect(() => {
    if (onDynamicCategoryChange && useCategoryMode && !usePureDynamicMode) {
      const validCategories = categoryList.filter(cat => cat.trim());
      onDynamicCategoryChange({
        enabled: useDynamicCategories,
        predefinedCategories: validCategories,
        useCategoryMode: useCategoryMode || usePureDynamicMode, // Either mode counts as "category mode" for processing
        usePureDynamicMode,
        discoveredCategories,
        stats: dynamicCategoryStats,
        onCategoryDiscovery: handleCategoryDiscovery
      });
    }
  }, [categoryList]);
  
  if (!file) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* AI Configuration Card */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center text-gray-900">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Settings className="w-4 h-4 text-gray-700" />
          </div>
          AI Configuration
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 bg-white/50"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 bg-white/50"
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
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <CheckCircle className="w-4 h-4 text-gray-700" />
          </div>
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white/50"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white/50"
              />
            )}
          </div>
        </div>
      </div>

      {/* Analysis Instructions Card */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Brain className="w-4 h-4 text-gray-700" />
          </div>
          Analysis Instructions
        </h3>
        
        <div className="space-y-4">
          {/* Category Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-center">
              <List className="w-5 h-5 text-amber-600 mr-2" />
              <div>
                <h4 className="font-medium text-gray-800">Category Allocation Mode</h4>
                <p className="text-xs text-gray-600">Let AI assign each row to predefined categories</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCategoryMode}
                onChange={(e) => handleCategoryModeToggle(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useCategoryMode ? 'bg-amber-600' : 'bg-gray-300'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useCategoryMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          {/* Category Management */}
          {useCategoryMode && !usePureDynamicMode && (
            <div className="border border-amber-200 rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Create your list of categories</h4>
                <p className="text-sm text-gray-600">Type categories and press Enter to add them to your list. Use commas to add multiple at once (e.g., "Tech, Finance, Healthcare"). AI will assign each row to one of these categories.</p>
              </div>
              
              {/* Add New Category Input */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Type categories (e.g., Technology, Healthcare, Finance) - separate multiple with commas"
                    className="flex-1 px-4 py-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        addCategory();
                      }
                    }}
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategory.trim() || categoryList.length >= 100}
                    className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </button>
                </div>
              </div>
              
              {/* Categories List */}
              {categoryList.filter(cat => cat.trim()).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-700">Your Categories:</h5>
                    <span className="text-sm text-gray-500">
                      {categoryList.filter(cat => cat.trim()).length} categories
                    </span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-amber-200 p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryList.filter(cat => cat.trim()).map((category, index) => (
                        <div key={index} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                          <div className="flex items-center">
                            <span className="w-5 h-5 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                          </div>
                          <button
                            onClick={() => removeCategory(index)}
                            className="w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors flex items-center justify-center"
                            title="Remove category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* No Categories Yet */}
              {categoryList.filter(cat => cat.trim()).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <List className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No categories added yet</p>
                  <p className="text-xs">Start typing above to create your first category</p>
                </div>
              )}
              
              {/* Limit Warning */}
              {categoryList.length >= 100 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">Maximum of 100 categories reached</p>
                </div>
              )}
              
              {/* Allocation Criteria */}
              <div className="mt-6 pt-4 border-t border-amber-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Criteria (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Specify how the AI should decide which category to assign to each row (e.g., "based on industry type", "by company size", "according to sentiment")
                </p>
                <textarea
                  value={allocationCriteria}
                  onChange={(e) => setAllocationCriteria(e.target.value)}
                  placeholder="Describe the criteria for category allocation... (e.g., 'Categorize companies based on their primary industry and business model')"
                  rows={3}
                  className="w-full px-4 py-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Pure Dynamic Mode Toggle */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="usePureDynamicMode"
                  checked={usePureDynamicMode}
                  onChange={(e) => {
                    setUsePureDynamicMode(e.target.checked);
                    if (e.target.checked) {
                      // When enabling Pure Dynamic Mode, turn off regular category mode
                      setUseCategoryMode(false);
                      setUseDynamicCategories(true); // Enable dynamic categories
                      setCategoryList([]); // Clear predefined categories
                      setAnalysisPrompt('Analyze the data and create appropriate categories based on the content and patterns you find.');
                    } else {
                      // When turning off pure dynamic mode, reset everything
                      setUseCategoryMode(false);
                      setUseDynamicCategories(false);
                      setCategoryList(['']);
                      setDiscoveredCategories([]);
                      setAnalysisPrompt('');
                    }
                  }}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="usePureDynamicMode" className="ml-3">
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">🧠</span>
                    <div>
                      <div className="font-medium text-gray-800">Pure AI Category Discovery</div>
                      <div className="text-sm text-gray-600">Let AI discover categories naturally without predefined lists</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {usePureDynamicMode && (
              <div className="mt-4 space-y-4">
                {/* Pure Discovery Instructions */}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                    <Brain className="w-4 h-4 text-purple-600 mr-2" />
                    AI Instructions for Category Discovery
                  </h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Tell the AI how to discover and create categories from your data. Be specific about what patterns or criteria it should look for.
                  </p>
                  <textarea
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    placeholder="Describe what categories the AI should discover from your data... (e.g., 'Analyze customer feedback and create categories based on the main topics and themes discussed')"
                    rows={4}
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                  />
                </div>

                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                    <span className="text-purple-600 mr-2">✨</span>
                    How Pure Discovery Works
                  </h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p><strong>No setup required</strong> - AI starts with zero categories</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p><strong>Organic discovery</strong> - Categories emerge from data patterns</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p><strong>Smart reuse</strong> - AI checks existing categories before creating new ones</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p><strong>Live updates</strong> - Watch categories appear in real-time</p>
                    </div>
                  </div>
                </div>

                {/* Discovered Categories Display */}
                {discoveredCategories.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-800 flex items-center">
                        <span className="text-purple-600 mr-2">🎯</span>
                        Discovered Categories ({discoveredCategories.length})
                      </h5>
                      <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="flex items-center text-sm text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        {showAllCategories ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            View All
                          </>
                        )}
                      </button>
                    </div>

                    {/* Latest Category Preview */}
                    {!showAllCategories && discoveredCategories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                          <span className="w-2 h-2 bg-purple-400 rounded-full mr-3 flex-shrink-0"></span>
                          <span className="text-sm font-medium text-gray-700">
                            {discoveredCategories[discoveredCategories.length - 1]}
                          </span>
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Latest
                          </span>
                        </div>
                        {discoveredCategories.length > 1 && (
                          <div className="text-center text-sm text-gray-500">
                            And {discoveredCategories.length - 1} more categories...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Full Categories List */}
                    {showAllCategories && (
                      <div className="max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {discoveredCategories.slice().reverse().map((category, reverseIndex) => {
                            const originalIndex = discoveredCategories.length - 1 - reverseIndex;
                            const isLatest = reverseIndex === 0;
                            return (
                              <div key={originalIndex} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                                <div className="flex items-center">
                                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3 flex-shrink-0"></span>
                                  <span className="text-sm font-medium text-gray-700">{category}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {isLatest && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                      Latest
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">#{originalIndex + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {discoveredCategories.length === 0 && (
                  <div className="bg-white rounded-lg p-4 border border-purple-100 text-center">
                    <div className="text-purple-400 mb-2">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <p className="text-sm text-gray-600">Categories will appear here as AI discovers them during analysis</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Category Enhancement for Pure Dynamic Mode */}
          {usePureDynamicMode && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center">
                    <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-gray-800">Pure Dynamic Mode Active</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    AI will discover categories automatically - no setup required!
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-green-700 font-medium">Enabled</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="text-center">
                  <div className="text-blue-600 mb-2">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h5 className="font-medium text-gray-800 mb-2">Ready for Analysis</h5>
                  <p className="text-sm text-gray-600">
                    Start your analysis and watch as AI discovers categories from your data in real-time.
                    All discovered categories will appear in the purple section above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Category Enhancement */}
          {useCategoryMode && !usePureDynamicMode && categoryList.filter(cat => cat.trim()).length > 0 && (
            <div className="mt-6 border-t border-amber-100 pt-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center">
                      <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="font-medium text-gray-800">Dynamic Category Enhancement</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Let AI intelligently create and reuse categories for large datasets (1000+ rows)
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useDynamicCategories"
                      checked={useDynamicCategories}
                      onChange={(e) => {
                        setUseDynamicCategories(e.target.checked);
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useDynamicCategories" className="ml-2 text-sm text-gray-700 font-medium">
                      Enable
                    </label>
                  </div>
                </div>

                {useDynamicCategories && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        <Brain className="w-4 h-4 text-blue-600 mr-2" />
                        How it works
                      </h5>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <p>Starts with your predefined categories as foundation</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <p>Intelligently reuses existing categories when semantically appropriate</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <p>Creates new categories only when truly needed</p>
                        </div>
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <p>Maintains consistency across large datasets</p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Category Statistics */}
                    {dynamicCategoryStats && (
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-800 flex items-center">
                            <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
                            Category Statistics
                          </h5>
                          <button
                            onClick={() => setShowDynamicStats(!showDynamicStats)}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {showDynamicStats ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Show Details
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {dynamicCategoryStats.totalCategories || 0}
                            </div>
                            <div className="text-xs text-gray-600">Total Categories</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {dynamicCategoryStats.totalItems || 0}
                            </div>
                            <div className="text-xs text-gray-600">Items Processed</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {dynamicCategoryStats.newCategories || 0}
                            </div>
                            <div className="text-xs text-gray-600">AI Created</div>
                          </div>
                          <div className="text-center p-3 bg-amber-50 rounded-lg">
                            <div className="text-2xl font-bold text-amber-600">
                              {dynamicCategoryStats.predefinedCategories || 0}
                            </div>
                            <div className="text-xs text-gray-600">Predefined</div>
                          </div>
                        </div>

                        {showDynamicStats && dynamicCategoryStats.categories && (
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-3">Category Distribution:</h6>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dynamicCategoryStats.categories.slice(0, 10).map((cat, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <span className={`w-3 h-3 rounded-full mr-2 ${cat.isPredefined ? 'bg-amber-400' : 'bg-purple-400'}`}></span>
                                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                      {cat.isPredefined && (
                                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                                          Predefined
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 ml-5">
                                      {cat.description || 'No description'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-800">{cat.count}</div>
                                    <div className="text-xs text-gray-500">
                                      {((cat.count / dynamicCategoryStats.totalItems) * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {dynamicCategoryStats.categories.length > 10 && (
                                <div className="text-center text-sm text-gray-500 py-2">
                                  And {dynamicCategoryStats.categories.length - 10} more categories...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Analysis Instructions */}
          {!useCategoryMode && (
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white/50 resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuration;