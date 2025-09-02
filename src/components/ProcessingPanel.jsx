import React from 'react';
import { Play, Pause, Download, AlertCircle, Info, DollarSign, RefreshCw, SkipForward, Database } from 'lucide-react';

const ProcessingPanel = ({
  file,
  apiKey,
  selectedInputColumns,
  analysisPrompt,
  outputColumn,
  isProcessing,
  progress,
  onStartProcessing,
  onRerunProcessing,
  onResumeProcessing,
  onPauseProcessing,
  errors,
  currentStep,
  setCurrentStep,
  onDownloadResults,
  onAnalyzeWithSQL,
  totalCost,
  selectedModel,
  dynamicCategoryOptions
}) => {
  if (!file) return null;

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  
  // Special validation for Pure Dynamic Mode - it doesn't need traditional setup
  const isPureDynamicMode = dynamicCategoryOptions?.usePureDynamicMode;
  const canStartProcessing = apiKey && selectedInputColumns.length > 0 && 
    (analysisPrompt || isPureDynamicMode) && outputColumn;

  return (
    <div className="space-y-6">
      {/* Processing Section */}
      {(apiKey || selectedInputColumns.length > 0 || analysisPrompt || outputColumn) && (
        <div className="card p-5">
          <h2 className="mb-4 flex items-center">
            <Play className="w-4 h-4 mr-2" />
            3. Process Data
          </h2>
          
          {!isProcessing && progress.current === 0 ? (
            <div className="space-y-3">
              {isPureDynamicMode && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">🧠</span>
                    <div className="text-sm">
                      <div className="font-medium text-purple-800">Pure AI Mode Active</div>
                      <div className="text-purple-600">Categories will be discovered automatically during analysis</div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setCurrentStep(3);
                  onStartProcessing();
                }}
                disabled={!canStartProcessing}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isPureDynamicMode ? 'Start AI Category Discovery' : 'Start Analysis'}
              </button>
            </div>
          ) : !isProcessing && progress.current > 0 && progress.current < progress.total ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onResumeProcessing}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </button>
                <button
                  onClick={onRerunProcessing}
                  className="btn w-full flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rerun All
                </button>
              </div>
              <button
                onClick={onDownloadResults}
                className="btn w-full flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Current Progress
              </button>
            </div>
          ) : progress.current >= progress.total && !isProcessing ? (
            <div className="space-y-2">
              <button
                onClick={onRerunProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Rerun with New Settings
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Progress: {progress.current} / {progress.total}
                </span>
                <span className="text-sm text-gray-500">
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="bg-neutral-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <div className="flex space-x-2">
                {isProcessing && (
                  <button
                    onClick={onPauseProcessing}
                    className="btn w-full flex items-center justify-center"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Processing
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cost Display */}
          {totalCost.total > 0 && (
            <div className="mt-4 p-3 card-muted">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-neutral-700 mr-2" />
                  <span className="font-medium">Processing Cost</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ${totalCost.total.toFixed(6)}
                  </div>
                  <div className="text-xs muted">
                    {progress.current} rows processed
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs muted">
                <div>Input: ${totalCost.input.toFixed(6)}</div>
                <div>Cached: ${totalCost.cached.toFixed(6)}</div>
                <div>Output: ${totalCost.output.toFixed(6)}</div>
              </div>
              <div className="mt-1 text-xs muted">
                Using {(() => {
                  const names = {
                    'gpt-4o-mini-2024-07-18': '4o-mini (Fastest)',
                    'gpt-5-nano-2025-08-07': 'GPT-5 Nano',
                    'gpt-5-mini-2025-08-07': 'GPT-5 Mini',
                    'o4-mini-2025-04-16': 'o4-mini',
                    'gpt-4.1-2025-04-14': 'GPT-4.1'
                  };
                  return names[selectedModel] || selectedModel;
                })()}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-3 card-muted">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-neutral-700 mr-2" />
                <span className="font-medium">Errors:</span>
              </div>
              <div className="text-sm text-neutral-700 max-h-20 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Download Section */}
      {currentStep >= 4 && (
        <div className="card p-5">
          <h2 className="mb-4 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            4. Export Results
          </h2>
          
          <div className="space-y-3">
            <button onClick={onDownloadResults} className="btn-primary w-full flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              Download as Excel File
            </button>
            
            {onAnalyzeWithSQL && (
              <button onClick={onAnalyzeWithSQL} className="btn w-full flex items-center justify-center">
                <Database className="w-4 h-4 mr-2" />
                Analyze with SQL
              </button>
            )}
            
            <div className="text-xs muted text-center mt-2">
              Continue analysis in Sheet Analysis for SQL queries and aggregations
            </div>
          </div>
          
          <div className="mt-3 p-3 card-muted">
            <div className="flex items-center">
              <Info className="w-4 h-4 text-neutral-700 mr-2" />
              <span className="text-sm text-neutral-700">
                Your original file with AI analysis results will be downloaded
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingPanel;
