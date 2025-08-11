import React from 'react';
import { Play, Pause, Download, AlertCircle, Info, DollarSign, RefreshCw, SkipForward } from 'lucide-react';

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
  totalCost,
  selectedModel
}) => {
  if (!file) return null;

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const canStartProcessing = apiKey && selectedInputColumns.length > 0 && analysisPrompt && outputColumn;

  return (
    <div className="space-y-6">
      {/* Processing Section */}
      {(apiKey || selectedInputColumns.length > 0 || analysisPrompt || outputColumn) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Play className="w-5 h-5 mr-2" />
            3. Process Data
          </h2>
          
          {!isProcessing && progress.current === 0 ? (
            <button
              onClick={() => {
                setCurrentStep(3);
                onStartProcessing();
              }}
              disabled={!canStartProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Start Analysis
            </button>
          ) : !isProcessing && progress.current > 0 && progress.current < progress.total ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onResumeProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </button>
                <button
                  onClick={onRerunProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rerun All
                </button>
              </div>
              <button
                onClick={onDownloadResults}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
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
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <div className="flex space-x-2">
                {isProcessing && (
                  <button
                    onClick={onPauseProcessing}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
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
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                  <span className="font-medium text-green-700">Processing Cost</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-700">
                    ${totalCost.total.toFixed(6)}
                  </div>
                  <div className="text-xs text-green-600">
                    {progress.current} rows processed
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-green-600">
                <div>Input: ${totalCost.input.toFixed(6)}</div>
                <div>Cached: ${totalCost.cached.toFixed(6)}</div>
                <div>Output: ${totalCost.output.toFixed(6)}</div>
              </div>
              <div className="mt-1 text-xs text-green-500">
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
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="font-medium text-red-700">Errors:</span>
              </div>
              <div className="text-sm text-red-600 max-h-20 overflow-y-auto">
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            4. Download Results
          </h2>
          
          <button
            onClick={onDownloadResults}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Analyzed File
          </button>
          
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Info className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm text-blue-700">
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