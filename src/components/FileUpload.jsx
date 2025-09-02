import React from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Clipboard } from 'lucide-react';

const FileUpload = ({ 
  file, 
  availableSheets, 
  selectedSheet, 
  onFileUpload, 
  onSheetChange, 
  onShowPasteMode,
  onDemoFileLoad
}) => {
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center">
        <div className="w-6 h-6 bg-neutral-100 rounded-md flex items-center justify-center mr-2">
          <Upload className="w-3.5 h-3.5 text-neutral-700" />
        </div>
        Upload Excel File
      </h2>
      
      <div className="space-y-4">
        {!file ? (
          <>
            <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-500 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-800">
                  Click to upload
                </span>
                <span className="muted"> or drag and drop</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={onFileUpload}
                />
              </label>
              <p className="text-sm muted mt-2">Excel files only (.xlsx, .xls)</p>
            </div>
            
            {onDemoFileLoad && (
              <div className="card-muted p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-2">Try Demo Files</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onDemoFileLoad('text.xlsx')}
                    className="w-full text-left px-3 py-2 text-sm btn-ghost"
                  >
                    📊 SDG Analysis Data (text.xlsx)
                  </button>
                  <button
                    onClick={() => onDemoFileLoad('products.xlsx')}
                    className="w-full text-left px-3 py-2 text-sm btn-ghost"
                  >
                    🏷️ Product Data (products.xlsx)
                  </button>
                </div>
              </div>
            )}
          </>
          
        ) : (
          <>
            <div className="card-muted p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-neutral-600 mr-2" />
                <span className="font-medium text-neutral-900">{file.name}</span>
              </div>
              {availableSheets.length > 1 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Select Sheet:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => onSheetChange(e.target.value)}
                    className="field"
                  >
                    {availableSheets.map(sheet => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {onDemoFileLoad && (
              <div className="card-muted p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-2">Switch to Demo Files</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onDemoFileLoad('text.xlsx')}
                    className="w-full text-left px-3 py-2 text-sm btn-ghost"
                  >
                    📊 SDG Analysis Data (text.xlsx)
                  </button>
                  <button
                    onClick={() => onDemoFileLoad('products.xlsx')}
                    className="w-full text-left px-3 py-2 text-sm btn-ghost"
                  >
                    🏷️ Product Data (products.xlsx)
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Always show paste option */}
        <div className="text-center">
          <span className="muted text-sm">{file ? 'or load different data' : 'or'}</span>
        </div>
        
        <button onClick={onShowPasteMode} className="btn w-full">
          <Clipboard className="w-4 h-4 mr-2" />
          Paste Excel Data
        </button>
        <p className="text-sm muted text-center">Copy data from Excel and paste it here</p>
      </div>
    </div>
  );
};

export default FileUpload;
