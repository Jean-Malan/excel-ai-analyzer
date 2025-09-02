import React, { useState, useCallback, useEffect } from 'react';
import { Database, Upload, Play, RotateCcw, Download, Brain } from 'lucide-react';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import CleanSemanticConfig from '../components/CleanSemanticConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as duckdb from '@duckdb/duckdb-wasm';

// Import components
import DataPreview from '../components/DataPreview';
import PasteModal from '../components/PasteModal';
import FileUpload from '../components/FileUpload';

// Import services
import { AIAnalysisService } from '../services/aiAnalysisService';
import { ProgressTracker, ProgressMessages } from '../services/progressTracker';

const SqlAnalysis = () => {
  console.log('🟢 SQL ANALYSIS COMPONENT LOADED');
  
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  
  // SQL Database state
  const [database, setDatabase] = useState(null);
  const [schema, setSchema] = useState([]);
  const [isDbReady, setIsDbReady] = useState(false);
  
  // Analysis state
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5-nano-2025-08-07');
  const [userQuestion, setUserQuestion] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState({ step: 0, total: 0, message: '', isActive: false });
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [showDebugLog, setShowDebugLog] = useState(false);
  
  // Real-time streaming results for semantic batch search
  const [streamingResults, setStreamingResults] = useState([]);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0, matches: 0, avgConfidence: 0 });
  
  // Semantic search configuration
  const [showSemanticConfig, setShowSemanticConfig] = useState(false);
  const [semanticConfig, setSemanticConfig] = useState({
    searchColumns: [], // Columns to search within
    returnColumns: [], // Columns to return in results
    includeConfidence: true,
    minConfidence: 0.7
  });

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);

  // For DataPreview component compatibility
  const [processedData, setProcessedData] = useState([]);
  const [selectedInputColumns, setSelectedInputColumns] = useState([]);
  const [outputColumn, setOutputColumn] = useState('');

  // Track if user manually reset to prevent auto-reload in development
  const [wasReset, setWasReset] = useState(false);
  
  // Paste mode state
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [pasteData, setPasteData] = useState('');
  
  // Dynamic category state
  const [dynamicCategoryOptions, setDynamicCategoryOptions] = useState({
    enabled: false,
    predefinedCategories: [],
    useCategoryMode: false,
    stats: null
  });
  

  // Check for transfer data on component mount
  useEffect(() => {
    const checkForTransferData = () => {
      try {
        const transferDataStr = sessionStorage.getItem('transferData');
        if (transferDataStr) {
          const transferData = JSON.parse(transferDataStr);
          if (transferData.source === 'row-by-row-analysis' && transferData.data) {
            // Clear the transfer data from session storage
            sessionStorage.removeItem('transferData');
            
            // Process the transferred data
            const lines = transferData.data.trim().split('\n');
            const parsedData = lines.map(line => line.split('\t'));
            
            if (parsedData.length > 0) {
              // Create mock file object
              const mockFile = {
                name: transferData.fileName,
                size: transferData.data.length,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              };
              
              setFile(mockFile);
              
              // Set headers and data
              const headerRow = parsedData[0];
              const dataRows = parsedData.slice(1);
              
              setHeaders(headerRow);
              setSheetData(dataRows);
              setProcessedData(dataRows.map(row => [...row])); // Copy for DataPreview
              setAvailableSheets(['Sheet1']);
              setSelectedSheet('Sheet1');
              
              // Create mock workbook for compatibility
              setWorkbook({ SheetNames: ['Sheet1'] });
              
              // Reset analysis states
              setQueryResults([]);
              setGeneratedQuery('');
              setAnalysisResults(null);
              setAnalysisProgress({ step: 0, total: 0, message: '', isActive: false });
              setAnalysisLogs([]);
              setSelectedInputColumns([]);
              setOutputColumn('');
              setIsDbReady(false);
              
              addLog('success', `📋 Data transferred from Row-by-Row Analysis: ${headerRow.length} columns, ${dataRows.length} rows`);
              
              // Transfer API key and model if provided
              if (transferData.apiKey) {
                setApiKey(transferData.apiKey);
                addLog('info', '🔑 API key transferred from Row-by-Row Analysis');
              }
              if (transferData.selectedModel) {
                setSelectedModel(transferData.selectedModel);
                addLog('info', `🤖 Model selection transferred: ${transferData.selectedModel}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing transfer data:', error);
      }
    };

    // Check if there's new sheet data from results
    const checkForNewSheetData = () => {
      const newSheetData = sessionStorage.getItem('newSheetData');
      if (newSheetData) {
        try {
          const parsedData = JSON.parse(newSheetData);
          if (parsedData.source === 'sql-analysis-results' && parsedData.data) {
            addLog('info', `🔄 Loading results as new sheet from ${parsedData.originalMethod}...`);
            
            const lines = parsedData.data.trim().split('\n');
            const sheetData = lines.map(line => line.split('\t'));
            
            if (sheetData.length > 0) {
              // Create mock file object
              const mockFile = {
                name: parsedData.fileName,
                size: parsedData.data.length,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              };
              
              setFile(mockFile);
              
              // Set headers and data
              const headerRow = sheetData[0];
              const dataRows = sheetData.slice(1);
              
              setHeaders(headerRow);
              setSheetData(dataRows);
              setProcessedData(dataRows.map(row => [...row])); // Copy for DataPreview
              setAvailableSheets(['Sheet1']);
              setSelectedSheet('Sheet1');
              
              // Create mock workbook for compatibility
              setWorkbook({ SheetNames: ['Sheet1'] });
              
              // Reset analysis states
              setQueryResults([]);
              setGeneratedQuery('');
              setAnalysisResults(null);
              setAnalysisProgress({ step: 0, total: 0, message: '', isActive: false });
              setAnalysisLogs([]);
              setStreamingResults([]);
              setBatchProgress({ completed: 0, total: 0, matches: 0, avgConfidence: 0 });
              setSelectedInputColumns([]);
              setOutputColumn('');
              setIsDbReady(false);
              
              addLog('success', `✨ Results loaded as new sheet: ${headerRow.length} columns, ${dataRows.length} rows from ${parsedData.originalMethod}`);
              
              // Transfer API key and model if provided
              if (parsedData.apiKey) {
                setApiKey(parsedData.apiKey);
                addLog('info', '🔑 API key transferred');
              }
              if (parsedData.selectedModel) {
                setSelectedModel(parsedData.selectedModel);
                addLog('info', `🤖 Model selection transferred: ${parsedData.selectedModel}`);
              }
              
              // Clear the transfer data
              sessionStorage.removeItem('newSheetData');
            }
          }
        } catch (error) {
          console.error('Error processing new sheet data:', error);
        }
      }
    };
    
    checkForTransferData();
    checkForNewSheetData();
  }, []);

  // Check for new sheet data when URL changes (e.g., after "Use as New Sheet")
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('source') === 'results') {
      // Small delay to ensure sessionStorage is set
      setTimeout(() => {
        const checkForNewSheetData = () => {
          const newSheetData = sessionStorage.getItem('newSheetData');
          if (newSheetData) {
            try {
              const parsedData = JSON.parse(newSheetData);
              if (parsedData.source === 'sql-analysis-results' && parsedData.data) {
                addLog('info', `🔄 Loading results as new sheet from ${parsedData.originalMethod}...`);
                
                const lines = parsedData.data.trim().split('\n');
                const sheetData = lines.map(line => line.split('\t'));
                
                if (sheetData.length > 0) {
                  const headerRow = sheetData[0];
                  const dataRows = sheetData.slice(1);
                  
                  // Create a mock workbook structure
                  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Transferred Results');
                  
                  // Set the workbook and sheet data
                  setWorkbook(wb);
                  setHeaders(headerRow);
                  setSheetData(dataRows);
                  setSelectedSheet('Transferred Results');
                  setAvailableSheets(['Transferred Results']);
                  
                  // Create mock file object
                  setFile({
                    name: parsedData.fileName || 'transferred_results.xlsx',
                    size: parsedData.data.length,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  });
                  
                  // Transfer API key and model if provided
                  if (parsedData.apiKey) {
                    setApiKey(parsedData.apiKey);
                    addLog('info', '🔑 API key transferred');
                  }
                  if (parsedData.selectedModel) {
                    setSelectedModel(parsedData.selectedModel);
                    addLog('info', `🤖 Model selection transferred: ${parsedData.selectedModel}`);
                  }
                  
                  // Clear the transfer data
                  sessionStorage.removeItem('newSheetData');
                }
              }
            } catch (error) {
              console.error('Error processing new sheet data:', error);
            }
          }
        };
        
        checkForNewSheetData();
      }, 100);
    }
  }, [location.search]);

  // Initialize DuckDB
  useEffect(() => {
    const initializeDuckDB = async () => {
      try {
        // Use CDN bundles for reliability
        const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
        const worker = await duckdb.createWorker(bundle.mainWorker);
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule);
        
        setDatabase(db);
      } catch (error) {
        console.error('Error initializing DuckDB:', error);
        setError('Failed to initialize DuckDB engine');
      }
    };
    initializeDuckDB();
  }, []);

  // Auto-load file in development environment
  useEffect(() => {
    const loadDevelopmentFile = async () => {
      // Check if environment is development (from .env file)
      const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development' || 
                           process.env.ENVIRONMENT === 'development' ||
                           process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !file && !wasReset && database) {
        // Define loadDemoFile inline to avoid hoisting issues
        try {
          const response = await fetch('/files/text.xlsx');
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            
            // Create a fake file object
            const mockFile = {
              name: 'text.xlsx',
              size: data.byteLength,
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              arrayBuffer: async () => arrayBuffer,
              stream: () => new Response(data).body,
              text: async () => { throw new Error('Not supported for binary files'); },
              slice: (start, end) => new Blob([data.slice(start, end)])
            };
            
            setFile(mockFile);
            
            // Process the Excel file
            const wb = XLSX.read(data, { type: 'array' });
            setWorkbook(wb);
            setAvailableSheets(wb.SheetNames);
            
            // Load first sheet by default
            if (wb.SheetNames.length > 0) {
              loadSheet(wb, wb.SheetNames[0]);
              setSelectedSheet(wb.SheetNames[0]);
            }
            
            addLog('info', `📁 Auto-loaded demo file: text.xlsx`);
          }
        } catch (error) {
          console.warn('Failed to auto-load demo file:', error);
        }
      }
    };
    
    loadDevelopmentFile();
  }, [file, wasReset, database]);

  const detectColumnType = (values) => {
    const nonEmptyValues = values.filter(v => v !== '' && v !== null && v !== undefined);
    if (nonEmptyValues.length === 0) return 'TEXT';
    
    // Check if all values are numbers
    const numberCount = nonEmptyValues.filter(v => !isNaN(v) && !isNaN(parseFloat(v))).length;
    if (numberCount === nonEmptyValues.length) return 'DOUBLE';
    
    // Check if values look like dates
    const dateCount = nonEmptyValues.filter(v => !isNaN(Date.parse(v))).length;
    if (dateCount > nonEmptyValues.length * 0.8) return 'DATE';
    
    return 'TEXT';
  };

  const analyzeSchema = (headers, sampleRows) => {
    return headers.map((header, i) => {
      const columnValues = sampleRows.map(row => row[i] || '');
      const uniqueValues = new Set(columnValues);
      
      return {
        name: header,
        type: detectColumnType(columnValues),
        sample: columnValues.find(v => v !== '' && v !== null && v !== undefined) || '',
        uniqueCount: uniqueValues.size,
        totalCount: columnValues.length,
        nullCount: columnValues.filter(v => v === '' || v === null || v === undefined).length
      };
    });
  };

  // Add logging function
  const addLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      type, // 'info', 'success', 'error', 'warning', 'debug'
      message,
      data
    };
    setAnalysisLogs(prev => [...prev, logEntry]);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`, data);
  }, []);


  const createSQLTable = useCallback(async () => {
    if (!database || !headers.length || !sheetData.length) {
      addLog('warning', '⚠️ Cannot create SQL table - missing database, headers, or data', {
        hasDatabase: !!database,
        headerCount: headers.length,
        dataRowCount: sheetData.length
      });
      return;
    }

    addLog('info', '🔧 Creating SQL table from sheet data...', {
      headerCount: headers.length,
      dataRowCount: sheetData.length
    });

    try {
      // Get a connection from the database
      const conn = await database.connect();
      
      // Drop ALL existing tables to ensure clean state
      addLog('debug', '🗑️ Dropping existing tables for clean state...');
      const tables = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
      if (tables.numRows > 0) {
        for (let i = 0; i < tables.numRows; i++) {
          const tableRow = tables.get(i, 0);
          const tableName = typeof tableRow === 'object' ? tableRow.table_name || tableRow : tableRow;
          addLog('debug', `Dropping table: ${tableName}`);
          await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
        }
        addLog('success', `✅ Dropped ${tables.numRows} existing tables`);
      }
      
      // Clean and deduplicate headers to avoid duplicate column names
      const cleanHeaders = headers.map((header, index) => {
        // Handle empty headers
        let cleanHeader = header?.toString().trim() || `Column_${index + 1}`;
        
        // Remove special characters and spaces for SQL compatibility
        cleanHeader = cleanHeader.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Ensure it doesn't start with a number
        if (/^[0-9]/.test(cleanHeader)) {
          cleanHeader = `Col_${cleanHeader}`;
        }
        
        return cleanHeader;
      });
      
      // Deduplicate column names
      const deduplicatedHeaders = [];
      const seenHeaders = new Set();
      
      cleanHeaders.forEach((header, index) => {
        let uniqueHeader = header;
        let counter = 1;
        
        while (seenHeaders.has(uniqueHeader.toLowerCase())) {
          uniqueHeader = `${header}_${counter}`;
          counter++;
        }
        
        seenHeaders.add(uniqueHeader.toLowerCase());
        deduplicatedHeaders.push(uniqueHeader);
      });
      
      // Analyze schema with clean headers
      const schemaInfo = analyzeSchema(deduplicatedHeaders, sheetData.slice(0, 100));
      setSchema(schemaInfo);
      
      // Create table with proper column types and clean names
      const columns = schemaInfo.map(col => 
        `"${col.name}" ${col.type}`
      ).join(', ');
      
      const createTableQuery = `CREATE TABLE excel_data (${columns})`;
      await conn.query(createTableQuery);
      
      // Insert data with proper column count
      const placeholders = deduplicatedHeaders.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO excel_data VALUES (${placeholders})`;
      
      // Prepare statement
      const stmt = await conn.prepare(insertQuery);
      
      // Log date columns for debugging
      const dateColumns = schemaInfo.filter(col => col.type === 'DATE');
      if (dateColumns.length > 0) {
        addLog('debug', `📅 Found ${dateColumns.length} date columns: ${dateColumns.map(col => col.name).join(', ')}`, {
          dateColumns: dateColumns.map(col => ({ name: col.name, sample: col.sample }))
        });
      }
      
      // Insert each row
      for (const row of sheetData) {
        // Ensure row has same length as headers
        const paddedRow = [...row];
        while (paddedRow.length < deduplicatedHeaders.length) {
          paddedRow.push('');
        }
        paddedRow.length = deduplicatedHeaders.length; // Trim if too long
        
        const processedRow = paddedRow.map((cell, i) => {
          if (schemaInfo[i] && schemaInfo[i].type === 'DOUBLE') {
            const num = parseFloat(cell);
            return isNaN(num) ? null : num;
          } else if (schemaInfo[i] && schemaInfo[i].type === 'DATE') {
            // Convert dates to YYYY-MM-DD format for DuckDB
            if (!cell || cell === '') return null;
            try {
              const parsedDate = new Date(cell);
              if (isNaN(parsedDate.getTime())) return null; // Invalid date
              // Format as YYYY-MM-DD
              const year = parsedDate.getFullYear();
              const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const day = String(parsedDate.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            } catch (error) {
              console.warn(`Failed to parse date: ${cell}`, error);
              return null;
            }
          }
          return cell || null;
        });
        
        await stmt.query(...processedRow);
      }
      
      await stmt.close();
      await conn.close();
      
      setIsDbReady(true);
      setError('');
      addLog('success', `🎉 SQL table 'excel_data' created successfully!`, {
        tableName: 'excel_data',
        columns: deduplicatedHeaders.length,
        rows: sheetData.length,
        cleanHeaders: deduplicatedHeaders
      });
      console.log(`✅ SQL table created successfully with ${deduplicatedHeaders.length} columns and ${sheetData.length} rows`);
    } catch (error) {
      addLog('error', `❌ Failed to create SQL table: ${error.message}`, {
        error: error.stack,
        headers: headers,
        sampleData: sheetData.slice(0, 2)
      });
      console.error('❌ Error creating SQL table:', error);
      console.log('Headers:', headers);
      console.log('Sheet data sample:', sheetData.slice(0, 2));
      setError(`Failed to create SQL table: ${error.message}`);
      setIsDbReady(false);
    }
  }, [database, headers, sheetData, addLog]);

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
      } catch (error) {
        console.error('Error reading file:', error);
        setError('Error reading Excel file. Please ensure it\'s a valid .xlsx or .xls file.');
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
      setProcessedData(dataRows.map(row => [...row])); // Copy original data for DataPreview
      setAvailableSheets(['Sheet1']);
      setSelectedSheet('Sheet1');
      
      // Create mock workbook for compatibility
      setWorkbook({ SheetNames: ['Sheet1'] });
      
      // Reset analysis states
      setQueryResults([]);
      setGeneratedQuery('');
      setAnalysisResults(null);
      setAnalysisProgress({ step: 0, total: 0, message: '', isActive: false });
      setAnalysisLogs([]);
      setSelectedInputColumns([]);
      setOutputColumn('');
      setIsDbReady(false);
      
      setShowPasteMode(false);
      setPasteData('');
      
      addLog('info', `📋 Pasted data loaded with ${headerRow.length} columns and ${dataRows.length} rows`);
      
    } catch (error) {
      console.error('Error parsing pasted data:', error);
      alert('Error parsing pasted data. Please make sure you copied the data correctly from Excel.');
    }
  }, [pasteData, addLog]);

  const loadSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    
    if (jsonData.length === 0) return;
    
    const headerRow = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    setHeaders(headerRow);
    setSheetData(dataRows);
    setProcessedData(dataRows.map(row => [...row])); // Copy original data for DataPreview
    setIsDbReady(false);
  };

  const handleSheetChange = (sheetName) => {
    addLog('info', `📋 Switching to sheet: ${sheetName}`);
    setSelectedSheet(sheetName);
    
    // Reset all states first
    setQueryResults([]);
    setGeneratedQuery('');
    setAnalysisResults(null);
    setAnalysisProgress({ step: 0, total: 0, message: '', isActive: false });
    setAnalysisLogs([]);
    setSelectedInputColumns([]);
    setOutputColumn('');
    setIsDbReady(false); // Mark database as not ready
    
    // Load the new sheet data
    loadSheet(workbook, sheetName);
    addLog('success', `✅ Sheet ${sheetName} loaded, database will be recreated automatically`);
  };

  // Create SQL table when data changes
  useEffect(() => {
    if (database && headers.length && sheetData.length) {
      createSQLTable();
    }
  }, [database, headers, sheetData, createSQLTable]);

  // Initialize progress tracker
  const progressTracker = new ProgressTracker((progress) => {
    setAnalysisProgress(progress);
    addLog('info', `Progress: Step ${progress.step}/${progress.total} - ${progress.message}`);
  });

  const intelligentAnalysis = async () => {
    console.log('🔥 INTELLIGENT ANALYSIS BUTTON CLICKED!', userQuestion);
    addLog('error', '🟢 BUTTON CLICKED - LOGS ARE WORKING!', { question: userQuestion });
    
    if (!userQuestion || !apiKey) {
      setError('Please enter both a question and your OpenAI API key');
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys should start with "sk-"');
      return;
    }

    console.log('✅ VALIDATION PASSED, STARTING ANALYSIS');
    setIsAnalyzing(true);
    setError('');
    setQueryResults([]);
    setGeneratedQuery('');
    setAnalysisResults(null);
    setAnalysisLogs([]); // Clear previous logs
    setStreamingResults([]); // Clear streaming results
    setBatchProgress({ completed: 0, total: 0, matches: 0, avgConfidence: 0 }); // Reset batch progress
    
    addLog('info', '🚀 Starting intelligent analysis...', { question: userQuestion, model: selectedModel });
    progressTracker.start(3, ProgressMessages.DETERMINING_STRATEGY);
    
    try {
      // Initialize AI service with logging
      addLog('debug', '⚙️ Initializing AI Analysis Service', { apiKeyPrefix: apiKey.substring(0, 8) + '...', model: selectedModel });
      const aiService = new AIAnalysisService(apiKey, selectedModel, addLog);
      
      // Prepare sample data for strategy determination
      const sampleData = sheetData.slice(0, 3).map(row => 
        schema.map((col, i) => row[i] || '')
      );
      
      addLog('info', '📊 Schema and sample data prepared', { 
        schemaColumns: schema.length, 
        sampleRowsCount: sampleData.length,
        totalRows: sheetData.length 
      });
      
      addLog('debug', '🎯 Schema details', { schema });
      addLog('debug', '📋 Sample data', { sampleData });
      
      // First, let AI determine strategy (with logging)
      addLog('info', '🎯 Determining analysis strategy...', { userQuestion });
      const strategy = await aiService.determineAnalysisStrategy(userQuestion, schema, sampleData);
      
      // LOG THE CHOSEN STRATEGY PROMINENTLY
      addLog('success', `🚀 STRATEGY SELECTED: ${strategy.method.toUpperCase()}`, { 
        method: strategy.method,
        reasoning: strategy.reasoning,
        expectedResults: strategy.expectedResults
      });
      
      // Run the intelligent analysis with enhanced logging
      progressTracker.nextStep('Executing chosen analysis method...');
      addLog('info', `🤖 Executing ${strategy.method} analysis...`);
      
      // Setup real-time callbacks for semantic batch search
      const callbacks = {
        onBatchComplete: (batchResult) => {
          addLog('info', `📦 Batch ${batchResult.batchIndex + 1} complete: ${batchResult.matches.length} new matches`, { 
            batchIndex: batchResult.batchIndex,
            newMatches: batchResult.matches.length 
          });
          
          // Add new matches to streaming results
          setStreamingResults(prev => [...prev, ...batchResult.matches]);
          
          // Update batch progress
          setBatchProgress({
            completed: batchResult.batchProgress.completed,
            total: batchResult.batchProgress.total,
            matches: streamingResults.length + batchResult.matches.length,
            avgConfidence: 0 // Will be updated by progress callback
          });
        },
        
        onProgressUpdate: (progress) => {
          setBatchProgress({
            completed: progress.completedBatches,
            total: progress.totalBatches,
            matches: progress.totalMatches,
            avgConfidence: progress.averageConfidence
          });
          
          addLog('info', `🔄 Progress: ${progress.completedBatches}/${progress.totalBatches} batches, ${progress.totalMatches} matches (${Math.round(progress.averageConfidence * 100)}% avg confidence)`);
        },
        
        // Pass semantic configuration and whether it's enabled
        semanticConfig: {
          ...semanticConfig,
          enabled: showSemanticConfig
        }
      };
      
      console.log('🚀 ABOUT TO CALL analyzeQuestion:', userQuestion);
      addLog('error', '🚀 ABOUT TO CALL AI SERVICE', { question: userQuestion });
      
      const results = await aiService.analyzeQuestion(
        userQuestion, 
        schema, 
        sampleData, 
        database,
        callbacks
      );
      console.log('📊 ANALYZE QUESTION COMPLETED:', results?.method);
      
      addLog('success', '✅ AI analysis completed successfully!', { 
        method: results.method,
        resultsCount: results.matches?.length || results.results?.length || 0
      });
      
      progressTracker.complete();
      setAnalysisResults(results);
      
      // Set legacy states for existing UI components
      if (results.sqlQuery) {
        addLog('info', '📝 SQL query generated', { query: results.sqlQuery });
        setGeneratedQuery(results.sqlQuery);
      }
      if (results.results || results.matches) {
        let resultData = results.results || results.matches || [];
        
        // Special handling for semantic search results to ensure compatibility
        if (results.method === 'semantic_batch_search' && resultData.length > 0) {
          resultData = resultData.map((row, index) => ({
            // Original row data first (for compatibility with row-by-row and sheet analysis)
            ...row,
            // Ensure confidence metadata is preserved for display
            _confidence: row._confidence || 0,
            _matchReason: row._matchReason || '',
            _batchIndex: row._batchIndex || 0,
            _globalIndex: row._globalIndex !== undefined ? row._globalIndex : index
          }));
          
          addLog('info', `✨ Semantic search results formatted for workflow compatibility`, {
            totalResults: resultData.length,
            hasConfidence: resultData.every(row => row._confidence !== undefined),
            dataColumns: Object.keys(resultData[0]).filter(key => !key.startsWith('_')).length,
            avgConfidence: Math.round(resultData.reduce((sum, row) => sum + row._confidence, 0) / resultData.length * 100)
          });
        }
        
        addLog('success', `📈 Found ${resultData.length} results`, { resultsPreview: resultData.slice(0, 3) });
        setQueryResults(resultData);
      }
      
      addLog('info', '🎉 Analysis complete! Results ready for review.');
      
    } catch (error) {
      console.error('Error in intelligent analysis:', error);
      addLog('error', `❌ Analysis failed: ${error.message}`, { error: error.stack });
      setError(`Analysis failed: ${error.message}`);
      progressTracker.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeIntelligentQuery = async (query) => {
    if (!database || !query) return [];

    try {
      const conn = await database.connect();
      const result = await conn.query(query);
      await conn.close();
      
      if (result.numRows > 0) {
        const formattedResults = [];
        for (let i = 0; i < result.numRows; i++) {
          const row = {};
          for (let j = 0; j < result.schema.fields.length; j++) {
            const fieldName = result.schema.fields[j].name;
            row[fieldName] = result.get(i, j);
          }
          formattedResults.push(row);
        }
        setQueryResults(formattedResults);
        return formattedResults;
      }
      return [];
    } catch (error) {
      console.error('Error executing intelligent query:', error);
      setError(`SQL Error: ${error.message}`);
      return [];
    }
  };

  const executeQuery = async (query = generatedQuery) => {
    if (!database || !query) return;

    try {
      const conn = await database.connect();
      const result = await conn.query(query);
      await conn.close();
      
      if (result.numRows > 0) {
        // Use DuckDB's toArray() method which should properly extract values
        const rawArray = result.toArray();
        const columns = result.schema.fields.map(f => f.name);
        
        console.log('DuckDB toArray result:', rawArray.slice(0, 2));
        console.log('DuckDB columns:', columns);
        console.log('Raw array first row structure:', rawArray[0]);
        console.log('Raw array first row type:', typeof rawArray[0]);
        console.log('Raw array first row keys:', rawArray[0] ? Object.keys(rawArray[0]) : 'no keys');
        
        // DuckDB toArray() returns properly formatted objects
        
        // rawArray already contains properly formatted objects!
        const formattedResults = rawArray.map(row => {
          // Clean up quoted numbers like "46" -> 46
          const cleanRow = {};
          Object.entries(row).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
              cleanRow[key] = value.slice(1, -1);
            } else {
              cleanRow[key] = value;
            }
          });
          return cleanRow;
        });
        
        console.log('DuckDB Query Results:', {
          numRows: result.numRows,
          numFields: result.schema.fields.length,
          fieldNames: result.schema.fields.map(f => f.name),
          firstRow: formattedResults[0],
          sampleData: formattedResults.slice(0, 2)
        });
        
        // Double-check the structure is correct
        console.log('First row keys:', Object.keys(formattedResults[0] || {}));
        console.log('First row values:', Object.values(formattedResults[0] || {}));
        console.log('First row value types:', Object.values(formattedResults[0] || {}).map(v => typeof v));
        console.log('Any objects in values?', Object.values(formattedResults[0] || {}).some(v => typeof v === 'object'));
        
        setQueryResults(formattedResults);
      } else {
        setQueryResults([]);
      }
      setError('');
    } catch (error) {
      console.error('Error executing query:', error);
      setError(`SQL Error: ${error.message}`);
    }
  };

  const resetTool = () => {
    setFile(null);
    setWorkbook(null);
    setSheetData([]);
    setHeaders([]);
    setSelectedSheet('');
    setAvailableSheets([]);
    setDatabase(null);
    setSchema([]);
    setIsDbReady(false);
    setApiKey('');
    setSelectedModel('gpt-5-nano-2025-08-07');
    setUserQuestion('');
    setGeneratedQuery('');
    setQueryResults([]);
    setIsAnalyzing(false);
    setError('');
    setAnalysisResults(null);
    setAnalysisProgress({ step: 0, total: 0, message: '', isActive: false });
    setAnalysisLogs([]);
    // Reset DataPreview state
    setProcessedData([]);
    setSelectedInputColumns([]);
    setOutputColumn('');
    setShowPasteMode(false);
    setPasteData('');
    setWasReset(true);
    
    // Reinitialize SQL.js
    const initializeSQL = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: file => `/${file}`
        });
        const db = new SQL.Database();
        setDatabase(db);
      } catch (error) {
        console.error('Error reinitializing SQL.js:', error);
        setError('Failed to initialize SQL engine');
      }
    };
    initializeSQL();
  };

  const processWithRowByRow = () => {
    try {
      console.log('[DEBUG] Row-by-row processing started:', {
        queryResultsLength: queryResults?.length,
        analysisResultsExists: !!analysisResults,
        analysisMethod: analysisResults?.method
      });
      
      let dataToTransfer = null;
      let fileName = '';
      
      // Check if we have query results to transfer
      if (queryResults && queryResults.length > 0) {
        // Clean the data for transfer (remove metadata for clean row-by-row analysis)
        const cleanedResults = queryResults.map(row => {
          const cleanRow = { ...row };
          // Remove semantic search metadata that shouldn't be in row-by-row analysis
          delete cleanRow._confidence;
          delete cleanRow._matchReason;
          delete cleanRow._batchIndex;
          delete cleanRow._localIndex;
          delete cleanRow._globalIndex;
          delete cleanRow._aiAnalysis;
          return cleanRow;
        });
        
        const resultHeaders = Object.keys(cleanedResults[0]);
        const resultRows = cleanedResults.map(row => 
          resultHeaders.map(header => row[header] ?? '')
        );
        
        dataToTransfer = [resultHeaders, ...resultRows]
          .map(row => row.join('\t'))
          .join('\n');
        
        // Use appropriate filename based on analysis method
        const methodName = analysisResults?.method || 'results';
        fileName = `${methodName}_${new Date().toISOString().slice(0,10)}.xlsx`;
      } else if (analysisResults && analysisResults.results && analysisResults.results.length > 0) {
        // Use AI analysis results if no SQL results
        const resultHeaders = Object.keys(analysisResults.results[0]);
        const resultRows = analysisResults.results.map(row => 
          resultHeaders.map(header => row[header] ?? '')
        );
        
        dataToTransfer = [resultHeaders, ...resultRows]
          .map(row => row.join('\t'))
          .join('\n');
        fileName = `analysis_results_${new Date().toISOString().slice(0,10)}.xlsx`;
      } else if (sheetData && sheetData.length > 0 && headers && headers.length > 0) {
        // Fallback to original sheet data
        dataToTransfer = [headers, ...sheetData]
          .map(row => row.join('\t'))
          .join('\n');
        fileName = file.name.replace(/\.[^/.]+$/, '') + '_for_row_analysis.xlsx';
      } else {
        alert('No data available to transfer. Please run a query or analysis first.');
        return;
      }
      
      // Store the data in sessionStorage for retrieval by Row-by-Row Analysis
      const transferData = {
        data: dataToTransfer,
        fileName: fileName,
        source: 'sheet-analysis',
        apiKey: apiKey, // Transfer the API key
        selectedModel: selectedModel, // Transfer the selected model too
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('transferData', JSON.stringify(transferData));
      
      // Navigate to Row-by-Row Analysis
      navigate('/excel-analysis');
      
    } catch (error) {
      console.error('Error transferring data to Row-by-Row Analysis:', error);
      alert('Error transferring data. Please try downloading results and then uploading to Row-by-Row Analysis manually.');
    }
  };

  const processAsNewSheet = () => {
    try {
      console.log('[DEBUG] New sheet processing started:', {
        queryResultsLength: queryResults?.length,
        analysisResultsExists: !!analysisResults,
        analysisMethod: analysisResults?.method
      });
      
      let dataToTransfer = null;
      let fileName = '';
      
      // Check if we have query results to transfer
      if (queryResults && queryResults.length > 0) {
        // Clean the data for transfer (remove metadata for clean sheet analysis)
        const cleanedResults = queryResults.map(row => {
          const cleanRow = { ...row };
          // Remove semantic search metadata that shouldn't be in sheet analysis
          delete cleanRow._confidence;
          delete cleanRow._matchReason;
          delete cleanRow._batchIndex;
          delete cleanRow._localIndex;
          delete cleanRow._globalIndex;
          delete cleanRow._aiAnalysis;
          return cleanRow;
        });
        
        const resultHeaders = Object.keys(cleanedResults[0]);
        const resultRows = cleanedResults.map(row => 
          resultHeaders.map(header => row[header] ?? '')
        );
        
        dataToTransfer = [resultHeaders, ...resultRows]
          .map(row => row.join('\t'))
          .join('\n');
        
        // Use appropriate filename based on analysis method
        const methodName = analysisResults?.method || 'results';
        fileName = `${methodName}_results_${new Date().toISOString().slice(0,10)}.xlsx`;
      } else if (analysisResults && (analysisResults.results || analysisResults.matches)) {
        // Use AI analysis results if no queryResults
        const resultData = analysisResults.results || analysisResults.matches || [];
        const cleanedResults = resultData.map(row => {
          const cleanRow = { ...row };
          delete cleanRow._confidence;
          delete cleanRow._matchReason;
          delete cleanRow._batchIndex;
          delete cleanRow._localIndex;
          delete cleanRow._globalIndex;
          delete cleanRow._aiAnalysis;
          return cleanRow;
        });
        
        const resultHeaders = Object.keys(cleanedResults[0]);
        const resultRows = cleanedResults.map(row => 
          resultHeaders.map(header => row[header] ?? '')
        );
        
        dataToTransfer = [resultHeaders, ...resultRows]
          .map(row => row.join('\t'))
          .join('\n');
        fileName = `${analysisResults.method}_results_${new Date().toISOString().slice(0,10)}.xlsx`;
      } else {
        alert('No results available to transfer. Please run an analysis first.');
        return;
      }
      
      // Store the data in sessionStorage for retrieval by Sheet Analysis
      const transferData = {
        data: dataToTransfer,
        fileName: fileName,
        source: 'sql-analysis-results',
        apiKey: apiKey, // Transfer the API key
        selectedModel: selectedModel, // Transfer the selected model too
        timestamp: Date.now(),
        originalMethod: analysisResults?.method
      };
      
      sessionStorage.setItem('newSheetData', JSON.stringify(transferData));
      
      console.log('[DEBUG] Data prepared for new sheet:', {
        fileName,
        dataLength: dataToTransfer.length,
        source: 'sql-analysis-results'
      });
      
      // Navigate to a new SQL Analysis instance
      navigate('/sql-analysis?source=results');
      
    } catch (error) {
      console.error('Error transferring data to new sheet:', error);
      alert('Error transferring data. Please try downloading results and then uploading manually.');
    }
  };

  // Column resizing functions
  const handleMouseDown = (e, columnKey) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(columnKey);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || 200; // Default width
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(50, startWidth + e.clientX - startX); // Minimum width of 50px
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Initialize column widths when results change
  useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      const columns = Object.keys(queryResults[0]);
      const initialWidths = {};
      
      columns.forEach(col => {
        if (!columnWidths[col]) {
          // Set initial width based on column content
          if (col === '_confidence' || analysisResults?.method === 'semantic_batch_search' && col === 'Confidence') {
            initialWidths[col] = 120;
          } else if (col.length > 15) {
            initialWidths[col] = 200;
          } else {
            initialWidths[col] = 150;
          }
        }
      });
      
      if (Object.keys(initialWidths).length > 0) {
        setColumnWidths(prev => ({ ...prev, ...initialWidths }));
      }
    }
  }, [queryResults, analysisResults]);

  // Load demo file function
  const loadDemoFile = async (fileName) => {
    try {
      const response = await fetch(`/files/${fileName}`);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        // Create a fake file object
        const mockFile = {
          name: fileName,
          size: data.byteLength,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          arrayBuffer: async () => arrayBuffer,
          stream: () => new Response(data).body,
          text: async () => { throw new Error('Not supported for binary files'); },
          slice: (start, end) => new Blob([data.slice(start, end)])
        };
        
        setFile(mockFile);
        setWasReset(false);
        
        // Process the file data
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setAvailableSheets(wb.SheetNames);
        
        // Load first sheet by default
        if (wb.SheetNames.length > 0) {
          loadSheet(wb, wb.SheetNames[0]);
          setSelectedSheet(wb.SheetNames[0]);
        }
        
        addLog('info', `📁 Demo file loaded: ${fileName}`);
      } else {
        console.error(`Failed to load demo file: ${fileName}`);
        addLog('error', `Failed to load demo file: ${fileName}`);
      }
    } catch (error) {
      console.error('Error loading demo file:', error);
      addLog('error', `Error loading demo file: ${error.message}`);
    }
  };

  // Download functions
  const downloadAsCSV = useCallback((data, filename = 'analysis_results') => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const cell = row[header];
          const cellStr = cell !== null && cell !== undefined ? String(cell) : '';
          // Escape quotes and wrap in quotes if contains comma or newline
          return cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"') 
            ? `"${cellStr.replace(/"/g, '""')}"` 
            : cellStr;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog('success', `📥 Downloaded ${data.length} rows as CSV: ${filename}.csv`);
  }, [addLog]);

  const downloadAsExcel = useCallback((data, filename = 'analysis_results') => {
    if (!data || data.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Auto-size columns
    const cols = Object.keys(data[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    worksheet['!cols'] = cols;
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    addLog('success', `📥 Downloaded ${data.length} rows as Excel: ${filename}.xlsx`);
  }, [addLog]);

  const models = [
    { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano (Most Affordable)', cost: '$0.05/1M' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini (Balanced)', cost: '$0.25/1M' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Description */}
        <div className="text-center mb-8">
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your Excel file and ask questions in natural language. We'll analyze your entire dataset and provide insights.
          </p>
        </div>
        
        {/* Utility Bar */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <button
            onClick={() => setShowDebugLog(!showDebugLog)}
            className={`py-2 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md ${
              showDebugLog 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={showDebugLog ? "Hide debug log" : "Show debug log"}
          >
            <span className="text-sm">{showDebugLog ? 'Hide Log' : 'Show Log'}</span>
          </button>
          
          <button
            onClick={resetTool}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
            title="Reset everything and start over"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Configuration Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* File Upload */}
            <FileUpload
              file={file}
              availableSheets={availableSheets}
              selectedSheet={selectedSheet}
              onFileUpload={handleFileUpload}
              onSheetChange={handleSheetChange}
              onShowPasteMode={() => setShowPasteMode(true)}
              onDemoFileLoad={import.meta.env.VITE_ENVIRONMENT === 'development' ? loadDemoFile : undefined}
            />
            
            {/* Database Status */}
            {file && isDbReady && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                  <p className="text-sm text-green-800 font-medium">
                    SQL table created with {sheetData.length} rows and {headers.length} columns
                  </p>
                </div>
              </div>
            )}

            {/* Model Configuration */}
            {file && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {!apiKey && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ API key required for intelligent analysis
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.cost}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Semantic Search Configuration - Clean Version */}
            {isDbReady && (
              <CleanSemanticConfig
                showSemanticConfig={showSemanticConfig}
                setShowSemanticConfig={setShowSemanticConfig}
                semanticConfig={semanticConfig}
                setSemanticConfig={setSemanticConfig}
                headers={headers}
                schema={schema}
              />
            )}

            {/* Query Input */}
            {isDbReady && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask a Question</h3>
                
                <div className="space-y-4">
                  <textarea
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder="e.g., Find all duplicate emails, Show me the top 10 highest values, Identify outliers in the revenue column..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  />
                  
                  {/* Example Questions */}
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Try these examples:</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setUserQuestion("Find duplicate records")}
                        className="block text-left text-blue-600 hover:text-blue-800 underline"
                      >
                        • Find duplicate records
                      </button>
                      <button
                        onClick={() => setUserQuestion("Show me the top 10 highest values")}
                        className="block text-left text-blue-600 hover:text-blue-800 underline"
                      >
                        • Show me the top 10 highest values
                      </button>
                      <button
                        onClick={() => setUserQuestion("Find all stationary items")}
                        className="block text-left text-green-600 hover:text-green-800 underline"
                        title="🎯 Semantic search - uses AI understanding instead of keyword matching"
                      >
                        • Find all stationary items <span className="text-xs text-green-500">(semantic)</span>
                      </button>
                      <button
                        onClick={() => setUserQuestion("Get me office supplies")}
                        className="block text-left text-green-600 hover:text-green-800 underline"
                        title="🎯 Semantic search - finds items by context and meaning"
                      >
                        • Get me office supplies <span className="text-xs text-green-500">(semantic)</span>
                      </button>
                      <button
                        onClick={() => setUserQuestion("Identify outliers in numeric columns")}
                        className="block text-left text-blue-600 hover:text-blue-800 underline"
                      >
                        • Identify outliers in numeric columns
                      </button>
                      <button
                        onClick={() => setUserQuestion("Calculate average, min, max for each category")}
                        className="block text-left text-blue-600 hover:text-blue-800 underline"
                      >
                        • Calculate statistics by category
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={intelligentAnalysis}
                    disabled={!userQuestion || !apiKey || isAnalyzing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Intelligent Analysis
                      </>
                    )}
                  </button>
                  
                  {/* Analysis Progress */}
                  {isAnalyzing && analysisProgress.isActive && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Analysis Progress</span>
                        <span className="text-sm text-blue-600">{analysisProgress.step}/{analysisProgress.total}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-blue-100 rounded-full h-2 mb-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${(analysisProgress.step / analysisProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      
                      {/* Current Step Message */}
                      <div className="flex items-center text-sm text-blue-700">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent mr-2"></div>
                        {analysisProgress.message}
                      </div>
                      
                      {/* Step Indicators */}
                      <div className="mt-3 space-y-1">
                        <div className={`flex items-center text-xs ${analysisProgress.step >= 1 ? 'text-blue-600' : 'text-blue-400'}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${analysisProgress.step >= 1 ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-500'}`}>
                            {analysisProgress.step > 1 ? '✓' : '1'}
                          </div>
                          Understanding question & data structure
                        </div>
                        <div className={`flex items-center text-xs ${analysisProgress.step >= 2 ? 'text-blue-600' : 'text-blue-400'}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${analysisProgress.step >= 2 ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-500'}`}>
                            {analysisProgress.step > 2 ? '✓' : '2'}
                          </div>
                          Executing intelligent SQL query
                        </div>
                        <div className={`flex items-center text-xs ${analysisProgress.step >= 3 ? 'text-blue-600' : 'text-blue-400'}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${analysisProgress.step >= 3 ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-500'}`}>
                            {analysisProgress.step > 3 ? '✓' : '3'}
                          </div>
                          Generating insights & conclusions
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Data Preview */}
            {file && sheetData.length > 0 && (
              <DataPreview
                sheetData={sheetData}
                headers={headers}
                processedData={processedData}
                selectedInputColumns={selectedInputColumns}
                outputColumn={outputColumn}
              />
            )}

            {/* Debug Log Status */}
            {showDebugLog && analysisLogs.length === 0 && (
              <div className="bg-gray-900 text-gray-400 rounded-2xl p-4 shadow-sm font-mono text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-3"></div>
                  <span>Debug logging enabled - logs will appear here during analysis</span>
                </div>
              </div>
            )}

            {/* Analysis Logs */}
            {showDebugLog && analysisLogs.length > 0 && (
              <div className="bg-gray-900 text-green-400 rounded-2xl p-6 shadow-sm font-mono text-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-300 flex items-center">
                    <span className="mr-2">🔍</span>
                    Analysis Debug Log
                  </h3>
                  <button
                    onClick={() => setAnalysisLogs([])}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg text-xs"
                  >
                    Clear Log
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {analysisLogs.map((log) => (
                    <div key={log.id} className="flex flex-col">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 text-xs shrink-0 mt-0.5">
                          [{log.timestamp}]
                        </span>
                        <span className={`text-xs font-medium shrink-0 mt-0.5 ${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          log.type === 'debug' ? 'text-blue-400' :
                          'text-gray-300'
                        }`}>
                          [{log.type.toUpperCase()}]
                        </span>
                        <span className="text-green-300">
                          {log.message}
                        </span>
                      </div>
                      {log.data && (
                        <div className="ml-20 mt-1">
                          <details className="text-gray-400 text-xs">
                            <summary className="cursor-pointer hover:text-gray-300">
                              Data details...
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-800 rounded border overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isAnalyzing && (
                  <div className="flex items-center mt-4 pt-4 border-t border-gray-700">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-400 border-t-transparent mr-2"></div>
                    <span className="text-green-300 text-xs">Analysis in progress...</span>
                  </div>
                )}
              </div>
            )}

            {/* Real-time Streaming Results for Semantic Search */}
            {isAnalyzing && batchProgress.total > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  </div>
                  🔍 Semantic Search in Progress
                </h3>
                
                {/* Real-time Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">
                      Processing Batches: {batchProgress.completed}/{batchProgress.total}
                    </span>
                    <span className="text-sm text-green-600">
                      {batchProgress.matches} matches found (avg: {Math.round(batchProgress.avgConfidence * 100)}%)
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-green-100 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Live Results Table */}
                {streamingResults.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-800 mb-3">
                      Live Results ({streamingResults.length} matches so far)
                    </h4>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto bg-white/60 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-gray-200">
                            {semanticConfig.includeConfidence && (
                              <th 
                                className="relative text-left p-2 font-medium text-gray-700 bg-green-50 select-none"
                                style={{ width: columnWidths['Confidence'] || 120, minWidth: '50px' }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700">🎯 Confidence</span>
                                  <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">AI</span>
                                </div>
                                {/* Resize handle */}
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                                  onMouseDown={(e) => handleMouseDown(e, 'Confidence')}
                                  title="Drag to resize column"
                                />
                              </th>
                            )}
                            {(() => {
                              // Show configured return columns or first few columns
                              const availableKeys = Object.keys(streamingResults[0]).filter(key => !key.startsWith('_'));
                              const keysToShow = semanticConfig.returnColumns && semanticConfig.returnColumns.length > 0 
                                ? semanticConfig.returnColumns.filter(col => availableKeys.includes(col))
                                : availableKeys.slice(0, 4);
                              
                              return keysToShow.map(key => (
                                <th 
                                  key={key} 
                                  className="relative text-left p-2 font-medium text-gray-700 select-none"
                                  style={{ width: columnWidths[key] || 150, minWidth: '50px' }}
                                >
                                  <div className="truncate">{key}</div>
                                  {/* Resize handle */}
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleMouseDown(e, key)}
                                    title="Drag to resize column"
                                  />
                                </th>
                              ));
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {streamingResults.slice(-10).map((row, i) => {
                            // Calculate keys to show (same logic as header)
                            const availableKeys = Object.keys(streamingResults[0]).filter(key => !key.startsWith('_'));
                            const keysToShow = semanticConfig.returnColumns && semanticConfig.returnColumns.length > 0 
                              ? semanticConfig.returnColumns.filter(col => availableKeys.includes(col))
                              : availableKeys.slice(0, 4);
                              
                            return (
                              <tr key={`streaming-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                                {semanticConfig.includeConfidence && (
                                  <td 
                                    className="p-2 bg-green-50/50"
                                    style={{ width: columnWidths['Confidence'] || 120, minWidth: '50px' }}
                                  >
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                                      row._confidence >= 0.9 ? 'bg-green-100 text-green-800' :
                                      row._confidence >= 0.8 ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {Math.round(row._confidence * 100)}%
                                    </div>
                                  </td>
                                )}
                                {keysToShow.map((key, j) => (
                                  <td 
                                    key={j} 
                                    className="p-2 text-gray-600"
                                    style={{ width: columnWidths[key] || 150, minWidth: '50px' }}
                                  >
                                    <div className="truncate" title={String(row[key] || '')}>
                                      {String(row[key] || '')}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {streamingResults.length > 10 && (
                        <div className="text-center p-2 text-xs text-gray-500 bg-gray-50">
                          Showing latest 10 of {streamingResults.length} matches...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REMOVED: AI Analysis Results moved to appear after Query Results */}

            {/* Query Results - NOW APPEARS FIRST */}
            {queryResults.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Results ({queryResults.length} rows)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadAsCSV(queryResults, `analysis_results_${new Date().toISOString().split('T')[0]}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      title="Download as CSV"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => downloadAsExcel(queryResults, `analysis_results_${new Date().toISOString().split('T')[0]}`)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      title="Download as Excel"
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={processWithRowByRow}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      title="Process these results row-by-row with AI"
                    >
                      <Brain className="w-4 h-4" />
                      Process Row-by-Row
                    </button>
                    <button
                      onClick={processAsNewSheet}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      title="Use these results as a new sheet for further analysis"
                    >
                      <Database className="w-4 h-4" />
                      Use as New Sheet
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        {analysisResults?.method === 'semantic_batch_search' && queryResults[0]?._confidence && (
                          <th 
                            className="relative text-left p-2 font-medium text-gray-700 bg-green-50 select-none"
                            style={{ width: columnWidths['Confidence'] || 120, minWidth: '50px' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-green-700">🎯 Confidence</span>
                              <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">AI</span>
                            </div>
                            {/* Resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => handleMouseDown(e, 'Confidence')}
                              title="Drag to resize column"
                            />
                          </th>
                        )}
                        {Object.keys(queryResults[0]).filter(key => !key.startsWith('_')).map(key => (
                          <th 
                            key={key} 
                            className="relative text-left p-2 font-medium text-gray-700 select-none"
                            style={{ width: columnWidths[key] || 150, minWidth: '50px' }}
                          >
                            <div className="truncate">{key}</div>
                            {/* Resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => handleMouseDown(e, key)}
                              title="Drag to resize column"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResults.map((row, i) => {
                        // Emergency debug
                        if (i === 0) {
                          console.log('=== DEBUGGING TABLE RENDER ===');
                          console.log('queryResults length:', queryResults.length);
                          console.log('First row:', row);
                          console.log('Type of row:', typeof row);
                          console.log('Is array?', Array.isArray(row));
                          console.log('Object.keys(row):', Object.keys(row));
                          console.log('Object.values(row):', Object.values(row));
                          
                          // Check if row is actually an array of objects
                          if (Array.isArray(row)) {
                            console.log('ROW IS ARRAY - each item:', row.map(item => typeof item));
                          }
                        }
                        
                        // Safety check: ensure row is a valid object
                        if (!row || typeof row !== 'object' || Array.isArray(row)) {
                          console.error('Invalid row data:', row);
                          return null;
                        }
                        
                        return (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            {/* Confidence column for semantic search */}
                            {analysisResults?.method === 'semantic_batch_search' && row._confidence && (
                              <td 
                                className="p-2 bg-green-50/50"
                                style={{ width: columnWidths['Confidence'] || 120, minWidth: '50px' }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`px-2.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                                    row._confidence >= 0.9 ? 'bg-green-500 text-white' :
                                    row._confidence >= 0.8 ? 'bg-blue-500 text-white' :
                                    row._confidence >= 0.7 ? 'bg-orange-500 text-white' :
                                    'bg-gray-400 text-white'
                                  }`}>
                                    {Math.round(row._confidence * 100)}%
                                  </div>
                                  {row._matchReason && (
                                    <div 
                                      className="text-xs text-gray-600 max-w-20 truncate cursor-help" 
                                      title={`Match Reason: ${row._matchReason}`}
                                    >
                                      💡 {row._matchReason.length > 15 ? row._matchReason.substring(0, 15) + '...' : row._matchReason}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            
                            {Object.keys(queryResults[0]).filter(key => !key.startsWith('_')).map((key, j) => {
                              let cellValue = row[key];
                              
                              // Handle DuckDB proxy objects
                              if (cellValue && typeof cellValue === 'object' && 'valueOf' in cellValue) {
                                cellValue = cellValue.valueOf();
                              }
                              
                              // Handle nested proxy objects
                              if (cellValue && typeof cellValue === 'object' && 'toString' in cellValue) {
                                cellValue = cellValue.toString();
                              }
                              
                              // Remove extra quotes from stringified numbers
                              if (typeof cellValue === 'string' && cellValue.startsWith('"') && cellValue.endsWith('"')) {
                                cellValue = cellValue.slice(1, -1);
                              }
                              
                              // FORCE convert everything to string - NEVER let objects through
                              let displayValue;
                              try {
                                if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
                                  displayValue = String(cellValue);
                                } else if (cellValue === null || cellValue === undefined) {
                                  displayValue = '';
                                } else if (typeof cellValue === 'object') {
                                  // Handle complex objects more safely
                                  if (cellValue.constructor === Object || Array.isArray(cellValue)) {
                                    displayValue = JSON.stringify(cellValue);
                                  } else {
                                    // For other object types, try toString first
                                    displayValue = cellValue.toString ? cellValue.toString() : String(cellValue);
                                  }
                                } else {
                                  // Fallback for any other type
                                  displayValue = String(cellValue);
                                }
                              } catch (error) {
                                console.error('Error converting cell value:', cellValue, error);
                                displayValue = '[Error rendering value]';
                              }
                              
                              return (
                                <td 
                                  key={j} 
                                  className="p-2 text-gray-600"
                                  style={{ width: columnWidths[key] || 150, minWidth: '50px' }}
                                >
                                  <div className="truncate" title={displayValue}>
                                    {displayValue}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Analysis Results - NOW APPEARS AFTER Query Results */}
            {analysisResults && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs">🧠</span>
                  </div>
                  AI Analysis Results
                </h3>
                
                <div className="space-y-4">
                  {/* Analysis Method */}
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Analysis Method</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-blue-700 capitalize">{analysisResults.method?.replace(/_/g, ' ')}</p>
                      {analysisResults.method === 'semantic_batch_search' && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Contextual AI Search
                        </span>
                      )}
                    </div>
                    {analysisResults.method === 'semantic_batch_search' && (
                      <p className="text-blue-600 text-sm mt-2">
                        🎯 Using AI's contextual understanding to find semantically relevant data
                      </p>
                    )}
                  </div>

                  {/* Statistics */}
                  {analysisResults.statistics && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {Object.entries(analysisResults.statistics).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="font-medium text-blue-900">
                              {typeof value === 'number' && key.includes('confidence') 
                                ? `${Math.round(value * 100)}%`
                                : typeof value === 'number' 
                                  ? Math.round(value * 100) / 100
                                  : typeof value === 'string'
                                    ? value
                                    : typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)
                              }
                            </p>
                            <p className="text-blue-600 text-xs capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {analysisResults.summary && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                      <p className="text-blue-700">
                        {typeof analysisResults.summary === 'string' 
                          ? analysisResults.summary 
                          : JSON.stringify(analysisResults.summary, null, 2)
                        }
                      </p>
                    </div>
                  )}

                  {/* Key Insights */}
                  {analysisResults.keyInsights && analysisResults.keyInsights.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Key Insights</h4>
                      <ul className="text-blue-700 space-y-1">
                        {analysisResults.keyInsights.map((insight, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Results Summary */}
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-blue-800">Results</h4>
                      {analysisResults.method === 'intelligent_analysis' && (
                        <div className="flex gap-2">
                          <button
                            onClick={processWithRowByRow}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            title="Process with Row-by-Row Analysis for detailed insights"
                          >
                            <ArrowRight className="w-3 h-3" />
                            Process Row-by-Row
                          </button>
                          <button
                            onClick={processAsNewSheet}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            title="Open as New Sheet for further analysis"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Use as New Sheet
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-blue-700">
                      Found {analysisResults.matches?.length || analysisResults.results?.length || 0} results
                      {analysisResults.total && ` out of ${analysisResults.total} total rows`}
                      {analysisResults.method === 'semantic_batch_search' && analysisResults.statistics?.averageConfidence && (
                        <span className="ml-2 text-sm text-green-600">
                          (avg confidence: {Math.round(analysisResults.statistics.averageConfidence * 100)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Query */}
            {generatedQuery && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated SQL Query</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  {generatedQuery}
                </div>
                <button
                  onClick={() => executeQuery()}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Re-run Query
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

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
      </div>
    </div>
    </div>
    </div>
  );
};

export default SqlAnalysis;