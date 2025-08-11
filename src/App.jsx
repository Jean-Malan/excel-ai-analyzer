import React, { useState, useCallback, useEffect } from 'react';
import { Brain, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import components
import ProgressSteps from './components/ProgressSteps';
import FileUpload from './components/FileUpload';
import Configuration from './components/Configuration';
import ProcessingPanel from './components/ProcessingPanel';
import DataPreview from './components/DataPreview';
import PasteModal from './components/PasteModal';
import SupportModal from './components/SupportModal';

const ExcelAIAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  
  // Configuration
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-2024-07-18');
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
  const [totalCost, setTotalCost] = useState({ input: 0, output: 0, cached: 0, total: 0 });
  const [costPerRow, setCostPerRow] = useState([]);
  
  // Current step
  const [currentStep, setCurrentStep] = useState(1);
  
  // Paste mode
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [pasteData, setPasteData] = useState('');
  
  // Support modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Track if user manually reset to prevent auto-reload in development
  const [wasReset, setWasReset] = useState(false);

  // Auto-load file in development environment
  useEffect(() => {
    const loadDevelopmentFile = async () => {
      // Check if environment is development (from .env file)
      const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development' || 
                           process.env.ENVIRONMENT === 'development' ||
                           process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !file && !wasReset) {
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
  }, [wasReset]);

  const handleFileUpload = useCallback((event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setWasReset(false); // Clear reset flag when new file is uploaded
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

  const handlePasteData = useCallback(() => {
    if (!pasteData.trim()) {
      alert('Please paste some data first');
      return;
    }

    try {
      // Parse TSV/CSV data (Excel copy usually comes as TSV)
      const lines = pasteData.trim().split('\n');
      const parsedData = lines.map(line => 
        line.split('\t').length > 1 ? line.split('\t') : line.split(',')
      );
      
      if (parsedData.length === 0) {
        alert('No data found to process');
        return;
      }

      // Create mock file object
      const mockFile = {
        name: 'pasted_data.xlsx',
        size: pasteData.length,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      setFile(mockFile);
      setWasReset(false); // Clear reset flag when new data is pasted
      
      // Set headers and data
      const headerRow = parsedData[0];
      const dataRows = parsedData.slice(1);
      
      setHeaders(headerRow);
      setSheetData(dataRows);
      setProcessedData(dataRows.map(row => [...row])); // Copy original data
      setAvailableSheets(['Sheet1']);
      setSelectedSheet('Sheet1');
      
      // Create mock workbook for compatibility
      setWorkbook({ SheetNames: ['Sheet1'] });
      
      setCurrentStep(2);
      setShowPasteMode(false);
      setPasteData('');
      
    } catch (error) {
      console.error('Error parsing pasted data:', error);
      alert('Error parsing pasted data. Please make sure you copied the data correctly from Excel.');
    }
  }, [pasteData]);

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

  const calculateCost = (usage, model) => {
    // Pricing per 1M tokens, so we divide by 1,000,000 to get per-token cost
    const pricing = {
      'gpt-4o-mini-2024-07-18': { input: 0.60 / 1000000, cached: 0.30 / 1000000, output: 2.40 / 1000000 },
      'gpt-5-nano-2025-08-07': { input: 0.05 / 1000000, cached: 0.005 / 1000000, output: 0.40 / 1000000 },
      'gpt-5-mini-2025-08-07': { input: 0.25 / 1000000, cached: 0.025 / 1000000, output: 2.00 / 1000000 },
      'o4-mini-2025-04-16': { input: 1.10 / 1000000, cached: 0.275 / 1000000, output: 4.40 / 1000000 },
      'gpt-4.1-2025-04-14': { input: 2.00 / 1000000, cached: 0.50 / 1000000, output: 8.00 / 1000000 }
    };

    const rates = pricing[model];
    const inputTokens = usage.prompt_tokens - (usage.prompt_tokens_details?.cached_tokens || 0);
    const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
    const outputTokens = usage.completion_tokens;

    const inputCost = inputTokens * rates.input;
    const cachedCost = cachedTokens * rates.cached;
    const outputCost = outputTokens * rates.output;
    const totalCost = inputCost + cachedCost + outputCost;

    return {
      inputCost: inputCost,
      cachedCost: cachedCost,
      outputCost: outputCost,
      totalCost: totalCost,
      tokens: {
        input: inputTokens,
        cached: cachedTokens,
        output: outputTokens,
        total: usage.total_tokens
      }
    };
  };

  const callOpenAI = async (inputData, prompt) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nData to analyze: ${inputData}`
          }
        ],
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content.trim(),
      usage: data.usage
    };
  };

  const startProcessing = async (resumeFromRow = 0) => {
    if (!apiKey || selectedInputColumns.length === 0 || !analysisPrompt || !outputColumn) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setErrors([]);
    
    // Only reset progress and costs if starting from beginning
    if (resumeFromRow === 0) {
      setProgress({ current: 0, total: sheetData.length });
      setTotalCost({ input: 0, output: 0, cached: 0, total: 0 });
      setCostPerRow([]);
    } else {
      setProgress(prev => ({ ...prev, current: resumeFromRow }));
    }

    const outputColIndex = outputColumn === 'new' 
      ? headers.length 
      : parseInt(outputColumn);

    // Add new column header if creating new column
    if (outputColumn === 'new') {
      const newHeaders = [...headers, customOutputColumn || 'AI Analysis'];
      setHeaders(newHeaders);
    }

    const updatedData = [...processedData];

    for (let i = resumeFromRow; i < sheetData.length; i++) {
      if (isPaused) break;

      try {
        const row = sheetData[i];
        const inputData = selectedInputColumns
          .map(colIndex => `${headers[colIndex]}: ${row[colIndex] || ''}`)
          .join('\n');

        if (inputData.trim()) {
          const result = await callOpenAI(inputData, analysisPrompt);
          const cost = calculateCost(result.usage, selectedModel);
          
          // Ensure row has enough columns
          while (updatedData[i].length <= outputColIndex) {
            updatedData[i].push('');
          }
          
          updatedData[i][outputColIndex] = result.content;
          
          // Update cost tracking
          setCostPerRow(prev => [...prev, { row: i + 1, cost }]);
          setTotalCost(prev => ({
            input: prev.input + cost.inputCost,
            output: prev.output + cost.outputCost,
            cached: prev.cached + cost.cachedCost,
            total: prev.total + cost.totalCost
          }));
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

  const rerunProcessing = async () => {
    // Rerun from the beginning with current settings
    await startProcessing(0);
  };

  const resumeProcessing = async () => {
    // Resume from where we left off
    await startProcessing(progress.current);
  };

  const downloadResults = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...processedData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSheet);
    
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '_analyzed.xlsx';
    XLSX.writeFile(wb, fileName);
    
    // Show support modal after download
    setShowSupportModal(true);
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
    setSelectedModel('gpt-4o-mini-2024-07-18');
    setIsProcessing(false);
    setIsPaused(false);
    setProgress({ current: 0, total: 0 });
    setProcessedData([]);
    setErrors([]);
    setCurrentStep(1);
    setShowPasteMode(false);
    setPasteData('');
    setWasReset(true);
    setTotalCost({ input: 0, output: 0, cached: 0, total: 0 });
    setCostPerRow([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Excel AI Analyzer</h1>
          </div>
          <p className="text-lg text-gray-600">Upload your Excel file and let AI analyze your data</p>
          
          {/* Always visible reset button */}
          <button
            onClick={resetTool}
            className="absolute top-0 right-0 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
            title="Reset everything and start over"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>

        {/* Progress Steps */}
        <ProgressSteps currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Upload */}
            <FileUpload
              file={file}
              availableSheets={availableSheets}
              selectedSheet={selectedSheet}
              onFileUpload={handleFileUpload}
              onSheetChange={handleSheetChange}
              onShowPasteMode={() => setShowPasteMode(true)}
            />

            {/* Configuration */}
            <Configuration
              file={file}
              apiKey={apiKey}
              setApiKey={setApiKey}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              headers={headers}
              selectedInputColumns={selectedInputColumns}
              onToggleColumnSelection={toggleColumnSelection}
              outputColumn={outputColumn}
              setOutputColumn={setOutputColumn}
              customOutputColumn={customOutputColumn}
              setCustomOutputColumn={setCustomOutputColumn}
              analysisPrompt={analysisPrompt}
              setAnalysisPrompt={setAnalysisPrompt}
            />

            {/* Processing Panel */}
            <ProcessingPanel
              file={file}
              apiKey={apiKey}
              selectedInputColumns={selectedInputColumns}
              analysisPrompt={analysisPrompt}
              outputColumn={outputColumn}
              isProcessing={isProcessing}
              progress={progress}
              onStartProcessing={startProcessing}
              onRerunProcessing={rerunProcessing}
              onResumeProcessing={resumeProcessing}
              onPauseProcessing={pauseProcessing}
              errors={errors}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              onDownloadResults={downloadResults}
              totalCost={totalCost}
              selectedModel={selectedModel}
            />
          </div>

          {/* Data Preview */}
          <div className="lg:col-span-2">
            <DataPreview
              sheetData={sheetData}
              headers={headers}
              processedData={processedData}
              selectedInputColumns={selectedInputColumns}
              outputColumn={outputColumn}
            />
          </div>
        </div>

        {/* Paste Data Modal */}
        <PasteModal
          showPasteMode={showPasteMode}
          pasteData={pasteData}
          setPasteData={setPasteData}
          onHandlePasteData={handlePasteData}
          onClose={() => {
            setShowPasteMode(false);
            setPasteData('');
          }}
        />

        {/* Support Modal */}
        <SupportModal
          show={showSupportModal}
          onClose={() => setShowSupportModal(false)}
        />
      </div>
    </div>
  );
};

export default ExcelAIAnalyzer;