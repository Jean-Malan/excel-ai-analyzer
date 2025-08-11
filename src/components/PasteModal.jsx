import React from 'react';
import { Clipboard, Info } from 'lucide-react';

const PasteModal = ({
  showPasteMode,
  pasteData,
  setPasteData,
  onHandlePasteData,
  onClose
}) => {
  if (!showPasteMode) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Clipboard className="w-6 h-6 mr-2" />
            Paste Excel Data
          </h2>
          
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">How to copy data from Excel:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Select your data in Excel (including headers)</li>
                    <li>Press Ctrl+C (or Cmd+C on Mac) to copy</li>
                    <li>Paste the data in the text area below</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your Excel data here:
            </label>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste your copied Excel data here... (including headers)"
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onHandlePasteData}
              disabled={!pasteData.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Process Pasted Data
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasteModal;