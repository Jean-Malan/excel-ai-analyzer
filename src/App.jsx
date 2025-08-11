import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Play, Pause, RotateCcw, Settings, FileSpreadsheet, Brain, CheckCircle, AlertCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExcelAIAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  
  // Configuration
  const [apiKey, setApiKey] = useState('');
  const [selectedInputColumns, setSelectedInputColumns] = useState([]);
  const [outputColumn, setOutputColumn] = useState('');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [customOutputColumn, setCustomOutputColumn] = useState('');
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [processedData, setProcessedData] = useState([]);
  const [errors, setErrors] = useState([]);
  
  // Current step
  const [currentStep, setCurrentStep] = useState(1);

  // Auto-load file in development environment
  useEffect(() => {
    const loadDevelopmentFile = async () => {
      // Check if environment is development (from .env file)
      const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development' || 
                           process.env.ENVIRONMENT === 'development' ||
                           process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !file) {
        try {
          const response = await fetch('/files/text.xlsx');
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            
            // Create a fake file object
            const mockFile = {
              name: 'text.xlsx',
              size: data.byteLength,
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
            
            setFile(mockFile);
            
            // Process the file data
            const wb = XLSX.read(data, { type: 'array' });
            setWorkbook(wb);
            setAvailableSheets(wb.SheetNames);
            
            // Load first sheet by default
            if (wb.SheetNames.length > 0) {
              loadSheet(wb, wb.SheetNames[0]);
              setSelectedSheet(wb.SheetNames[0]);
            }
            
            setCurrentStep(2);
          }
        } catch (error) {
          console.log('Development file not found or error loading:', error);
        }
      }
    };
    
    loadDevelopmentFile();
  }, []);

  const handleFileUpload = useCallback((event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setAvailableSheets(wb.SheetNames);
        
        // Load first sheet by default
        if (wb.SheetNames.length > 0) {
          loadSheet(wb, wb.SheetNames[0]);
          setSelectedSheet(wb.SheetNames[0]);
        }
        
        setCurrentStep(2);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading Excel file. Please ensure it\'s a valid .xlsx or .xls file.');
      }
    };
    
    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  const loadSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    
    if (jsonData.length === 0) return;
    
    const headerRow = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    setHeaders(headerRow);
    setSheetData(dataRows);
    setProcessedData(dataRows.map(row => [...row])); // Copy original data
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    loadSheet(workbook, sheetName);
    // Reset selections when changing sheets
    setSelectedInputColumns([]);
    setOutputColumn('');
  };

  const toggleColumnSelection = (columnIndex) => {
    setSelectedInputColumns(prev => 
      prev.includes(columnIndex) 
        ? prev.filter(i => i !== columnIndex)
        : [...prev, columnIndex]
    );
  };

  const callOpenAI = async (inputData, prompt) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nData to analyze: ${inputData}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const startProcessing = async () => {
    if (!apiKey || selectedInputColumns.length === 0 || !analysisPrompt || !outputColumn) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setErrors([]);
    setProgress({ current: 0, total: sheetData.length });

    const outputColIndex = outputColumn === 'new' 
      ? headers.length 
      : parseInt(outputColumn);

    // Add new column header if creating new column
    if (outputColumn === 'new') {
      const newHeaders = [...headers, customOutputColumn || 'AI Analysis'];
      setHeaders(newHeaders);
    }

    const updatedData = [...processedData];

    for (let i = 0; i < sheetData.length; i++) {
      if (isPaused) break;

      try {
        const row = sheetData[i];
        const inputData = selectedInputColumns
          .map(colIndex => `${headers[colIndex]}: ${row[colIndex] || ''}`)
          .join('\n');

        if (inputData.trim()) {
          const analysis = await callOpenAI(inputData, analysisPrompt);
          
          // Ensure row has enough columns
          while (updatedData[i].length <= outputColIndex) {
            updatedData[i].push('');
          }
          
          updatedData[i][outputColIndex] = analysis;
        }

        setProgress({ current: i + 1, total: sheetData.length });
        setProcessedData([...updatedData]);

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        setErrors(prev => [...prev, `Row ${i + 1}: ${error.message}`]);
      }
    }

    setIsProcessing(false);
    setCurrentStep(4);
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    setIsProcessing(false);
  };

  const downloadResults = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...processedData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSheet);
    
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '_analyzed.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  const resetTool = () => {
    setFile(null);
    setWorkbook(null);
    setSheetData([]);
    setHeaders([]);
    setSelectedSheet('');
    setAvailableSheets([]);
    setSelectedInputColumns([]);
    setOutputColumn('');
    setAnalysisPrompt('');
    setCustomOutputColumn('');
    setIsProcessing(false);
    setIsPaused(false);
    setProgress({ current: 0, total: 0 });
    setProcessedData([]);
    setErrors([]);
    setCurrentStep(1);
  };

  const getStepStatus = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Excel AI Analyzer</h1>
          </div>
          <p className="text-lg text-gray-600">Upload your Excel file and let AI analyze your data</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, label: 'Upload File', icon: Upload },
              { step: 2, label: 'Configure', icon: Settings },
              { step: 3, label: 'Process', icon: Play },
              { step: 4, label: 'Download', icon: Download }
            ].map(({ step, label, icon: Icon }) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  getStepStatus(step) === 'completed' 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : getStepStatus(step) === 'current'
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                  {getStepStatus(step) === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  getStepStatus(step) === 'pending' ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {label}
                </span>
                {step < 4 && <div className="w-8 h-0.5 bg-gray-300 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Step 1: File Upload */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                1. Upload Excel File
              </h2>
              
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
                      onChange={handleFileUpload}
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
                        onChange={(e) => handleSheetChange(e.target.value)}
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
            </div>

            {/* Step 2: Configuration */}
            {file && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  2. Configuration
                </h2>
                
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OpenAI API Key *
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="font-medium">🔒 SECURE:</span>
                        <span className="ml-1">Your API key is only used locally in your browser and is NEVER stored, saved, or transmitted to any server other than OpenAI directly.</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Columns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Input Columns * (data to analyze)
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {headers.map((header, index) => (
                        <label key={index} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedInputColumns.includes(index)}
                            onChange={() => toggleColumnSelection(index)}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                    >
                      <option value="">Select output column...</option>
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
                        placeholder="Enter column name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}
                  </div>

                  {/* Analysis Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Analysis Instructions *
                    </label>
                    <textarea
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      placeholder="Describe what analysis you want the AI to perform on each row..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {file && (apiKey || selectedInputColumns.length > 0 || analysisPrompt || outputColumn) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Play className="w-5 h-5 mr-2" />
                  3. Process Data
                </h2>
                
                {!isProcessing && progress.current === 0 ? (
                  <button
                    onClick={() => {
                      setCurrentStep(3);
                      startProcessing();
                    }}
                    disabled={!apiKey || selectedInputColumns.length === 0 || !analysisPrompt || !outputColumn}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    Start Analysis
                  </button>
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
                      {isProcessing ? (
                        <button
                          onClick={pauseProcessing}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </button>
                      ) : progress.current > 0 && progress.current < progress.total ? (
                        <button
                          onClick={startProcessing}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </button>
                      ) : null}
                      
                      <button
                        onClick={resetTool}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </button>
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

            {/* Step 4: Download */}
            {currentStep >= 4 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  4. Download Results
                </h2>
                
                <button
                  onClick={downloadResults}
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

          {/* Data Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Data Preview</h2>
              
              {sheetData.length > 0 ? (
                <div className="overflow-auto max-h-96 border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 ${
                              selectedInputColumns.includes(index) ? 'bg-blue-100' : ''
                            } ${
                              parseInt(outputColumn) === index || (outputColumn === 'new' && index === headers.length - 1) ? 'bg-green-100' : ''
                            }`}
                          >
                            {header || `Column ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {processedData.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {headers.map((_, colIndex) => (
                            <td
                              key={colIndex}
                              className={`px-4 py-2 text-sm text-gray-900 border-r border-gray-200 max-w-xs truncate ${
                                selectedInputColumns.includes(colIndex) ? 'bg-blue-50' : ''
                              } ${
                                parseInt(outputColumn) === colIndex || (outputColumn === 'new' && colIndex === headers.length - 1) ? 'bg-green-50' : ''
                              }`}
                              title={row[colIndex]}
                            >
                              {row[colIndex] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Upload an Excel file to see data preview
                </div>
              )}
              
              {sheetData.length > 10 && (
                <div className="mt-2 text-sm text-gray-500 text-center">
                  Showing first 10 rows of {sheetData.length} total rows
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelAIAnalyzer;