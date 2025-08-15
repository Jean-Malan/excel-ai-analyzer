import React, { useState, useCallback, useEffect } from 'react';
import { Database, Upload, Play, RotateCcw, Download, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-2024-07-18');
  const [userQuestion, setUserQuestion] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState({ step: 0, total: 0, message: '', isActive: false });
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [showDebugLog, setShowDebugLog] = useState(false);

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
    
    checkForTransferData();
  }, []);

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
    if (!userQuestion || !apiKey) {
      setError('Please enter both a question and your OpenAI API key');
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys should start with "sk-"');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setQueryResults([]);
    setGeneratedQuery('');
    setAnalysisResults(null);
    setAnalysisLogs([]); // Clear previous logs
    
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
      
      // Run the intelligent analysis with enhanced logging
      progressTracker.nextStep('Executing chosen analysis method...');
      addLog('info', '🤖 Calling AI service to analyze question...');
      
      const results = await aiService.analyzeQuestion(
        userQuestion, 
        schema, 
        sampleData, 
        database
      );
      
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
        const resultData = results.results || results.matches || [];
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
    setSelectedModel('gpt-4o-mini-2024-07-18');
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
      let dataToTransfer = null;
      let fileName = '';
      
      // Check if we have SQL query results to transfer
      if (queryResults && queryResults.length > 0) {
        // Use SQL query results
        const resultHeaders = Object.keys(queryResults[0]);
        const resultRows = queryResults.map(row => 
          resultHeaders.map(header => row[header] ?? '')
        );
        
        dataToTransfer = [resultHeaders, ...resultRows]
          .map(row => row.join('\t'))
          .join('\n');
        fileName = `sql_results_${new Date().toISOString().slice(0,10)}.xlsx`;
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
    { id: 'gpt-4o-mini-2024-07-18', name: '4o-mini (Fastest)', cost: '$0.60/1M' },
    { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano (Most Affordable)', cost: '$0.05/1M' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini (Balanced)', cost: '$0.25/1M' },
    { id: 'o4-mini-2025-04-16', name: 'o4-mini (Advanced Reasoning)', cost: '$1.10/1M' },
    { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1 (Most Capable)', cost: '$2.00/1M' }
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
              onDemoFileLoad={loadDemoFile}
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

            {/* AI Analysis Results */}
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
                    <p className="text-blue-700 capitalize">{analysisResults.method?.replace(/_/g, ' ')}</p>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                    <p className="text-blue-700">
                      {(() => {
                        const summary = analysisResults.summary;
                        if (typeof summary === 'string') {
                          return summary;
                        } else if (typeof summary === 'object' && summary !== null) {
                          // Handle object summaries by creating a structured display
                          return (
                            <div className="space-y-2">
                              {Object.entries(summary)
                                .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                                .map(([key, value], index) => (
                                  <div key={index} className="border-l-2 border-blue-300 pl-3">
                                    <div className="font-medium text-blue-800 capitalize text-sm">
                                      {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-blue-700 text-sm">
                                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          );
                        }
                        return 'Analysis completed successfully';
                      })()}
                    </p>
                  </div>
                  
                  {/* Insights from legacy format or analysis results */}
                  {(analysisResults.analysis?.insights || analysisResults.insights) && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Key Insights</h4>
                      <ul className="space-y-1">
                        {(() => {
                          const insights = analysisResults.analysis?.insights || analysisResults.insights;
                          
                          // Handle both array and object formats
                          if (Array.isArray(insights)) {
                            return insights.map((insight, i) => (
                              <li key={i} className="text-blue-700 flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {typeof insight === 'string' ? insight : JSON.stringify(insight)}
                              </li>
                            ));
                          } else if (typeof insights === 'object') {
                            // Handle object format - display key insights
                            if (insights.insights && Array.isArray(insights.insights)) {
                              return insights.insights.map((insight, i) => (
                                <li key={i} className="text-blue-700 flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  {typeof insight === 'string' ? insight : JSON.stringify(insight)}
                                </li>
                              ));
                            } else {
                              // Fallback for other object structures - render each key-value pair
                              return Object.entries(insights).map(([key, value], i) => (
                                <li key={i} className="text-blue-700 flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  <div>
                                    <span className="font-medium">{key.replace(/_/g, ' ')}: </span>
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </div>
                                </li>
                              ));
                            }
                          }
                          
                          return null;
                        })()}
                      </ul>
                    </div>
                  )}
                  
                  {/* Conclusion */}
                  {(analysisResults.analysis?.conclusion || analysisResults.conclusion) && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Conclusion</h4>
                      <p className="text-blue-700">
                        {(() => {
                          const conclusion = analysisResults.analysis?.conclusion || analysisResults.conclusion;
                          return typeof conclusion === 'string' ? conclusion : JSON.stringify(conclusion);
                        })()}
                      </p>
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {(analysisResults.analysis?.recommendations || analysisResults.recommendations) && (
                    <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2">Recommendations</h4>
                      <p className="text-blue-700">
                        {(() => {
                          const recommendations = analysisResults.analysis?.recommendations || analysisResults.recommendations;
                          return typeof recommendations === 'string' ? recommendations : JSON.stringify(recommendations);
                        })()}
                      </p>
                    </div>
                  )}
                  
                  {/* Results Count */}
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-800">Results</h4>
                      {(analysisResults.matches?.length > 0 || analysisResults.results?.length > 0) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const data = analysisResults.matches || analysisResults.results || [];
                              const cleanData = data.map(row => {
                                const cleanRow = { ...row };
                                delete cleanRow._aiAnalysis; // Remove AI metadata for cleaner export
                                return cleanRow;
                              });
                              downloadAsCSV(cleanData, `ai_analysis_${analysisResults.method}_${new Date().toISOString().split('T')[0]}`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                            title="Download AI analysis results as CSV"
                          >
                            <Download className="w-3 h-3" />
                            CSV
                          </button>
                          <button
                            onClick={() => {
                              const data = analysisResults.matches || analysisResults.results || [];
                              const cleanData = data.map(row => {
                                const cleanRow = { ...row };
                                delete cleanRow._aiAnalysis; // Remove AI metadata for cleaner export
                                return cleanRow;
                              });
                              downloadAsExcel(cleanData, `ai_analysis_${analysisResults.method}_${new Date().toISOString().split('T')[0]}`);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                            title="Download AI analysis results as Excel"
                          >
                            <Download className="w-3 h-3" />
                            Excel
                          </button>
                          <button
                            onClick={processWithRowByRow}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                            title="Process these results row-by-row with AI"
                          >
                            <Brain className="w-3 h-3" />
                            Row-by-Row
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-blue-700">
                      Found {analysisResults.matches?.length || analysisResults.results?.length || 0} results
                      {analysisResults.total && ` out of ${analysisResults.total} total rows`}
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

            {/* Query Results */}
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
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        {Object.keys(queryResults[0]).map(key => (
                          <th key={key} className="text-left p-2 font-medium text-gray-700">
                            {key}
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
                        
                        return (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            {Object.keys(queryResults[0]).map((key, j) => {
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
                              if (typeof cellValue === 'string' || typeof cellValue === 'number') {
                                displayValue = String(cellValue);
                              } else if (cellValue === null || cellValue === undefined) {
                                displayValue = '';
                              } else {
                                // Last resort - stringify any remaining objects
                                displayValue = JSON.stringify(cellValue);
                              }
                              
                              return (
                                <td key={j} className="p-2 text-gray-600 max-w-48 truncate">
                                  {displayValue}
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
      </div>
    </div>
  );
};

export default SqlAnalysis;