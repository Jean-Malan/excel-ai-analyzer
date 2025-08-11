import React from 'react';
import { X, Play, Book } from 'lucide-react';

const TutorialModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Book className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-2xl font-semibold text-gray-900">How to Use Excel AI Analyzer</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Video Section */}
          <div className="mb-8">
            <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
              <video 
                controls 
                className="w-full max-h-96 object-contain"
                poster="/cover.png"
                preload="metadata"
              >
                <source src="/recording.mov" type="video/quicktime" />
                <source src="/recording.mov" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex items-center justify-center mt-3">
              <Play className="w-4 h-4 text-gray-500 mr-2" />
              <p className="text-sm text-gray-600">Watch the tutorial to see Excel AI Analyzer in action</p>
            </div>
          </div>

          {/* Step-by-Step Guide */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Guide</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Upload Your Excel File</h4>
                    <p className="text-sm text-gray-600">
                      Click "Click to upload" or drag and drop your Excel file. You can also use "Paste Excel Data" 
                      if you want to copy data directly from Excel.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Configure AI Settings</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Enter your OpenAI API key and select your preferred AI model. Each model has different 
                      capabilities and pricing - choose based on your needs.
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                      💡 Your API key stays local and is never stored on our servers
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Select Your Data</h4>
                    <p className="text-sm text-gray-600">
                      Choose which columns contain the data you want to analyze (input columns) and where 
                      you want the AI results to go (output column). Use "Select All" for convenience.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Write Analysis Instructions</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Describe what you want the AI to do with your data. Be specific about the format you want.
                    </p>
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                      <strong>Examples:</strong><br/>
                      • "Analyze sentiment: return Positive, Negative, or Neutral"<br/>
                      • "Extract the main topic from this feedback"<br/>
                      • "Rate satisfaction level from 1-10 based on the comment"
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    5
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Start Processing</h4>
                    <p className="text-sm text-gray-600">
                      Click "Start Analysis" to begin. Watch the progress and costs in real-time. 
                      You can pause, resume, or rerun with different settings anytime.
                    </p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                    6
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Download Results</h4>
                    <p className="text-sm text-gray-600">
                      Once processing is complete (or even partially complete), download your Excel file 
                      with the new AI-generated insights added.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Start with 4o-mini (fastest) for testing, then switch to more powerful models if needed</li>
                <li>• Use the pause/resume feature to control costs and test different prompts</li>
                <li>• Be specific in your analysis instructions for better results</li>
                <li>• You can rerun analysis with different models without re-uploading your file</li>
                <li>• Keep an eye on the real-time cost tracker to stay within budget</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Need help? This tutorial will guide you through each step.
            </p>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;