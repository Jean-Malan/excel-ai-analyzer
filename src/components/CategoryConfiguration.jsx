import React, { useState } from 'react';
import { List, Plus, Trash2, Brain, ChevronDown, ChevronUp } from 'lucide-react';

const CategoryConfiguration = ({
  dynamicCategoryOptions,
  onDynamicCategoryChange,
  analysisPrompt,
  setAnalysisPrompt
}) => {
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [categoryList, setCategoryList] = useState(['']);
  const [newCategory, setNewCategory] = useState('');
  const [allocationCriteria, setAllocationCriteria] = useState('');
  const [useCategoryMode, setUseCategoryMode] = useState(false);
  const [usePureDynamicMode, setUsePureDynamicMode] = useState(dynamicCategoryOptions?.usePureDynamicMode || false);

  const addCategory = () => {
    if (!newCategory.trim()) return;
    
    // Handle multiple categories separated by commas
    const newCategories = newCategory.split(',').map(cat => cat.trim()).filter(cat => cat);
    const updatedList = [...categoryList.filter(cat => cat.trim()), ...newCategories];
    
    setCategoryList(updatedList.slice(0, 100)); // Max 100 categories
    setNewCategory('');
  };

  const removeCategory = (index) => {
    const updatedList = categoryList.filter((_, i) => i !== index);
    setCategoryList(updatedList.length === 0 ? [''] : updatedList);
  };

  const handleCategoryModeToggle = (enabled) => {
    setUseCategoryMode(enabled);
    if (enabled) {
      setUsePureDynamicMode(false);
    }
  };

  const handlePureDynamicModeToggle = (enabled) => {
    setUsePureDynamicMode(enabled);
    
    if (onDynamicCategoryChange) {
      onDynamicCategoryChange({
        ...dynamicCategoryOptions,
        usePureDynamicMode: enabled,
        enabled: enabled
      });
    }

    if (enabled) {
      setUseCategoryMode(false);
      setCategoryList([]);
      setAnalysisPrompt('Analyze the data and create appropriate categories based on the content and patterns you find.');
    } else {
      setCategoryList(['']);
      setAnalysisPrompt('');
    }
  };

  const hasCategories = useCategoryMode || usePureDynamicMode;

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <button
        onClick={() => setShowCategoryConfig(!showCategoryConfig)}
        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
          showCategoryConfig 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <List className="w-4 h-4 mr-3" />
          <div className="text-left">
            <span className="font-medium">Category Configuration</span>
            {hasCategories && (
              <div className="text-xs text-gray-500 mt-0.5">
                {usePureDynamicMode ? 'AI Discovery Mode' : useCategoryMode ? `${categoryList.filter(c => c.trim()).length} custom categories` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {hasCategories && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full mr-2">
              Active
            </span>
          )}
          {showCategoryConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Configuration Panel */}
      {showCategoryConfig && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          
          {/* Category Allocation Mode */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <List className="w-4 h-4 text-gray-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Custom Categories</h4>
                <p className="text-sm text-gray-500">Define specific categories for your data</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCategoryMode}
                onChange={(e) => handleCategoryModeToggle(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                useCategoryMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  useCategoryMode ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          {/* Category Management */}
          {useCategoryMode && !usePureDynamicMode && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Add Categories</h4>
                <p className="text-sm text-gray-600">Create your category list. Use commas to add multiple at once.</p>
              </div>
              
              {/* Add New Category Input */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Technology, Healthcare, Finance (use commas for multiple)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        addCategory();
                      }
                    }}
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategory.trim() || categoryList.length >= 100}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center"
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
                    <h5 className="font-medium text-gray-700">Your Categories</h5>
                    <span className="text-sm text-gray-500">
                      {categoryList.filter(cat => cat.trim()).length} categories
                    </span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-gray-200 p-3">
                    <div className="space-y-2">
                      {categoryList.filter(cat => cat.trim()).map((category, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-center">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">
                              {index + 1}
                            </span>
                            <span className="text-sm text-gray-900">{category}</span>
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
                <div className="text-center py-6 text-gray-500">
                  <List className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No categories added yet</p>
                  <p className="text-xs">Start typing above to create your first category</p>
                </div>
              )}
              
              {/* Allocation Criteria */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How should AI categorize? (Optional)
                </label>
                <textarea
                  value={allocationCriteria}
                  onChange={(e) => setAllocationCriteria(e.target.value)}
                  placeholder="e.g., 'By industry type', 'By company size', 'By sentiment'"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Pure Dynamic Mode */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="usePureDynamicMode"
                  checked={usePureDynamicMode}
                  onChange={(e) => handlePureDynamicModeToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mr-3"
                />
                <label htmlFor="usePureDynamicMode" className="flex items-center cursor-pointer">
                  <Brain className="w-4 h-4 text-gray-600 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">AI Category Discovery</div>
                    <div className="text-sm text-gray-500">Let AI discover categories automatically</div>
                  </div>
                </label>
              </div>
            </div>

            {usePureDynamicMode && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 mb-1">
                    AI will analyze your data and create meaningful categories based on discovered patterns.
                  </p>
                  <p className="text-xs text-blue-600">
                    Perfect when you don't know what categories exist in your data.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryConfiguration;