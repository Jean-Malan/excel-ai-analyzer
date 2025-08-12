import React from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Clipboard } from 'lucide-react';

const FileUpload = ({ 
  file, 
  availableSheets, 
  selectedSheet, 
  onFileUpload, 
  onSheetChange, 
  onShowPasteMode 
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
          <Upload className="w-4 h-4 text-gray-700" />
        </div>
        Upload Excel File
      </h2>
      
      <div className="space-y-4">
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="text-indigo-600 hover:text-indigo-500 font-medium">
                Click to upload
              </span>
              <span className="text-gray-500"> or drag and drop</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={onFileUpload}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Excel files only (.xlsx, .xls)</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="font-medium text-green-700">{file.name}</span>
            </div>
            {availableSheets.length > 1 && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Sheet:
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {availableSheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        {/* Always show paste option */}
        <div className="text-center">
          <span className="text-gray-500 text-sm">{file ? 'or load different data' : 'or'}</span>
        </div>
        
        <button
          onClick={onShowPasteMode}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
        >
          <Clipboard className="w-5 h-5 mr-2" />
          Paste Excel Data
        </button>
        <p className="text-sm text-gray-500 text-center">Copy data from Excel and paste it here</p>
      </div>
    </div>
  );
};

export default FileUpload;