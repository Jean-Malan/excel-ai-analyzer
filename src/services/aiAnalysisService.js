import { DynamicPatternDetection } from './dynamicPatternDetection.js';
import DynamicCategoryManager from './dynamicCategoryManager.js';

/**
 * AI Analysis Service
 * Centralized service for all AI-powered data analysis
 */

export class AIAnalysisService {
  constructor(apiKey, model = 'gpt-4o-mini-2024-07-18', logger = null) {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = logger || (() => {}); // Default no-op logger
    this.patternDetector = new DynamicPatternDetection(apiKey, model, logger);
    this.categoryManager = new DynamicCategoryManager(apiKey, model, logger);
  }

  // Utility function to safely stringify objects with BigInt values
  safeStringify(obj, space = null) {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value <= Number.MAX_SAFE_INTEGER ? Number(value) : value.toString();
      }
      return value;
    }, space);
  }

  log(type, message, data = null) {
    if (typeof this.logger === 'function') {
      this.logger(type, message, data);
    }
  }

  /**
   * Main entry point - AI chooses the best analysis strategy
   */
  async analyzeQuestion(userQuestion, schema, sampleData, database) {
    if (!this.apiKey || !userQuestion) {
      throw new Error('API key and question are required');
    }

    // Step 1: Let AI choose the analysis strategy
    const strategy = await this.determineAnalysisStrategy(userQuestion, schema, sampleData);
    
    // Step 2: Execute the chosen strategy
    switch (strategy.method) {
      case 'row_by_row_ai':
        return await this.executeRowByRowAI(userQuestion, schema, database, strategy);
      case 'batch_ai':
        return await this.executeBatchAI(userQuestion, schema, database, strategy);
      case 'sql_computational':
        return await this.executeSQLComputational(userQuestion, schema, database, strategy);
      case 'hybrid':
        return await this.executeHybrid(userQuestion, schema, database, strategy);
      default:
        throw new Error(`Unknown analysis method: ${strategy.method}`);
    }
  }

  /**
   * AI determines the best analysis approach
   */
  async determineAnalysisStrategy(userQuestion, schema, sampleData) {
    this.log('info', '🎯 Determining optimal analysis strategy...', { question: userQuestion, schemaColumns: schema.length });
    
    const schemaDescription = schema.map(col => 
      `${col.name} (${col.type}, sample: "${col.sample}", ${col.uniqueCount} unique values)`
    ).join('\n');

    this.log('debug', '📋 Schema analysis complete', { schemaDescription, sampleDataRows: sampleData.length });

    const prompt = `Analyze this data question and choose the best approach:

Question: "${userQuestion}"

Dataset Schema (EXACT column names for SQL):
${schemaDescription}

CRITICAL: When generating SQL queries, use EXACTLY these column names:
${schema.map(col => `"${col.name}"`).join(', ')}

Sample Data:
${sampleData.map((row, i) => `Row ${i + 1}: ${row.join(', ')}`).join('\n')}

CRITICAL ANALYSIS: If the question contains words like "optimal", "best", "minimum cost", "cheapest", "picking list", "recommendation", you MUST choose "hybrid".

Choose the BEST analysis method:

1. "row_by_row_ai" - When you need to check each row individually with AI
   - Use for: Language detection, sentiment analysis, content classification, complex data parsing/transformation
   - Example: "Find all French content", "Identify negative reviews", "sum semicolon-separated values", "parse complex formats"

2. "batch_ai" - When you need AI but can process rows in batches
   - Use for: Pattern recognition across multiple rows, categorization
   - Example: "Group similar projects", "Find related items"

3. "sql_computational" - When it's a pure data/math question with simple results
   - Use for: Counts, averages, sums, duplicates, statistical analysis, string operations
   - Example: "How many rows?", "Find duplicates", "Calculate average", "sum semicolon-separated numbers"
   - AVOID for: Complex optimization, multi-step business logic, large result sets, window functions in WHERE clause
   - NEVER use for: "optimal", "best cost", "minimum cost", "picking lists", "recommendations"  
   - PERFECT for semicolon-separated values: Use DuckDB's string_split and array functions
   - For summary rows: Use ROLLUP, GROUPING SETS, or separate aggregation queries - NEVER mismatched UNION

4. "hybrid" - When you need SQL first, then AI analysis
   - Use for: Complex optimization, business logic, multi-step analysis, large datasets
   - PERFECT for: Cost optimization, recommendation systems, complex decision making, window function logic
   - REQUIRED for: Any query with "optimal", "best cost", "minimum cost", "picking lists", "recommendations"
   - Example: "Analyze sentiment of high-value customers", "optimal picking lists", "cost optimization", "find cheapest options"

IMPORTANT: 
- The data is stored in a table named "excel_data". All SQL queries must reference this table name exactly.
- CRITICAL: Use the EXACT column names from the schema above. Column names are already cleaned and quoted.
- Use DuckDB syntax with powerful functions:
  * Aggregation: COUNT(*), SUM(column), AVG(column), MIN(column), MAX(column)
  * String: SUBSTR(string, start, length), LENGTH(string), UPPER(string), LOWER(string), TRIM(string)
  * Text functions: REPLACE(string, old, new), INSTR(string, substring), CONTAINS(string, substring)
  * Pattern matching: column LIKE 'pattern%' (starts with), column LIKE '%pattern%' (contains)
  * Logic: CASE WHEN condition THEN value ELSE value END
  * Array functions: string_split(string, delimiter), list_sum(array), array_length(array)
  * Powerful transformations: string_split_regex, list_transform, etc.
- CRITICAL SQL RULES:
  * When using GROUP BY, ALL non-aggregated columns in SELECT must be in GROUP BY clause
  * Use ANY_VALUE(column) for columns you don't want to group by but need to show
  * Window functions (ROW_NUMBER, RANK) go in SELECT, never in WHERE
  * For window function filtering, use subqueries or CTEs
  
- COMMON GROUP BY MISTAKES TO AVOID:
  * WRONG: SELECT WBS_Number, COUNT(*) FROM excel_data GROUP BY other_column
  * RIGHT: SELECT WBS_Number, COUNT(*) FROM excel_data GROUP BY WBS_Number
  * WRONG: SELECT id, name, SUM(amount) FROM excel_data GROUP BY name
  * RIGHT: SELECT ANY_VALUE(id), name, SUM(amount) FROM excel_data GROUP BY name
  * OR RIGHT: SELECT id, name, SUM(amount) FROM excel_data GROUP BY id, name
  
- WHEN TO USE ANY_VALUE():
  * Use ANY_VALUE(column) when you need to show a column but don't want to group by it
  * Example: SELECT ANY_VALUE(WBS_Number), category, SUM(cost) FROM excel_data GROUP BY category
  * This shows one WBS_Number per category (could be any value from that group)
  
- WHEN YOU MUST USE GROUP BY:
  * Whenever you use aggregate functions like SUM(), COUNT(), AVG(), MIN(), MAX()
  * If you have both aggregate functions AND non-aggregate columns in SELECT
  * Example questions that need GROUP BY: "sum by category", "count per group", "average per type"
  
- WHEN NOT TO USE GROUP BY:
  * Simple SELECT without aggregate functions: SELECT * FROM excel_data WHERE condition
  * Filtering or sorting without aggregation: SELECT column1, column2 FROM excel_data ORDER BY column1
- For semicolon-separated numbers: Use string_split(column, ';') to create arrays, then list_sum() to sum them
- Example DuckDB queries: 
  * SELECT *, list_sum(string_split(column_name, ';')::INTEGER[]) as column_sum FROM excel_data
  * SELECT column_name, list_sum(CAST(string_split(column_name, ';') AS INTEGER[])) as total FROM excel_data
  * For optimization: WITH ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY cost_col) as rn FROM excel_data) SELECT * FROM ranked WHERE rn = 1
  * For multiple columns: SELECT *, list_sum(string_split(col1, ';')::INTEGER[]) as col1_sum, list_sum(string_split(col2, ';')::INTEGER[]) as col2_sum FROM excel_data
  * For summary rows at the bottom: Use UNION ALL with proper column matching:
    - First query: SELECT all data rows
    - Second query: SELECT aggregated totals with same column structure
    - Example: SELECT col1, col2, sum_col FROM data UNION ALL SELECT 'TOTAL' as col1, '' as col2, SUM(sum_col) as sum_col FROM data
    - For semicolon data with totals: Use UNION ALL with same column count and appropriate aggregate functions
  * For GROUPING SETS/ROLLUP: Use when you want subtotals within the same result structure
  * CRITICAL: UNION requires exact same number and types of columns in both parts

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON, no markdown or explanations
- Escape all quotes in strings: use \\" for literal quotes
- Escape all backslashes: use \\\\ for literal backslashes  
- No trailing commas
- No line breaks in string values
- Use null instead of empty objects

Respond in JSON:
{
  "method": "chosen_method",
  "reasoning": "Why this method is best",
  "sqlQuery": "DuckDB SQL query using EXACT schema column names above (table: 'excel_data', null if not needed)",
  "aiPrompt": "AI prompt template if needed",
  "batchSize": 10,
  "expectedResults": "What type of results to expect"
}`;

    this.log('debug', '🤖 Sending strategy prompt to AI', { promptLength: prompt.length });
    const response = await this.callOpenAI(prompt, 0.1);
    this.log('debug', '📝 AI strategy response received', { responseLength: response.content?.length });
    
    const strategy = this.parseJSONResponse(response.content);
    this.log('success', `✅ Strategy determined: ${strategy.method}`, { strategy });
    
    return strategy;
  }

  /**
   * Method 1: Row-by-row AI analysis with intelligent row vs column detection
   */
  async executeRowByRowAI(userQuestion, schema, database, strategy) {
    this.log('info', '🔍 Starting row-by-row AI analysis...', { strategy: strategy.method });
    
    const conn = await database.connect();
    const result = await conn.query("SELECT * FROM excel_data");
    await conn.close();
    
    if (!result.numRows) {
      this.log('warning', '⚠️ No data found in database');
      return { rows: [], summary: "No data found" };
    }

    // Use DuckDB's toArray() method to properly extract values
    const rawArray = result.toArray();
    const columns = result.schema.fields.map(f => f.name);
    
    // rawArray already contains properly formatted objects!
    const rows = rawArray.map(row => {
      // Clean up quoted numbers like "46" -> 46 and handle BigInt values
      const cleanRow = {};
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'bigint') {
          // Convert BigInt to regular number or string if too large
          cleanRow[key] = value <= Number.MAX_SAFE_INTEGER ? Number(value) : value.toString();
        } else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          cleanRow[key] = value.slice(1, -1);
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });

    this.log('info', `📊 Processing ${rows.length} rows with ${result.schema.fields.length} columns`, {
      totalRows: rows.length,
      columns: result.schema.fields.map(f => f.name)
    });

    // Determine query type with priority: transformation > column-specific > holistic
    this.log('info', '🔍 QUERY TYPE DETECTION: Starting query type analysis', { userQuestion });
    
    const isDataTransformation = await this.isDataTransformationQuery(userQuestion, schema, data.values.slice(0, 2));
    this.log('info', `📊 TRANSFORMATION CHECK: ${isDataTransformation}`, { isDataTransformation, userQuestion });
    
    const isColumnQuery = !isDataTransformation && this.isColumnSpecificQuery(userQuestion);
    this.log('info', `📋 COLUMN QUERY CHECK: ${isColumnQuery}`, { isColumnQuery, userQuestion, transformationOverride: isDataTransformation });
    
    const queryType = isDataTransformation ? 'Data-transformation' : isColumnQuery ? 'Column-specific' : 'Row-holistic';
    this.log('success', `🎯 FINAL QUERY TYPE: ${queryType}`, { 
      userQuestion,
      isDataTransformation, 
      isColumnQuery,
      finalType: queryType
    });

    let columnAnalysis = {};
    
    // Only do column analysis if it's a column-specific query (not for transformations)
    if (isColumnQuery && !isDataTransformation) {
      this.log('info', '🔬 Starting column pattern analysis for column-specific query...');
      for (const col of data.columns) {
        const columnValues = rows.map(row => row[col]).filter(val => val != null && val !== '');
        if (columnValues.length > 0) {
          try {
            this.log('debug', `Analyzing column: ${col}`, { valueCount: columnValues.length, sampleValues: columnValues.slice(0, 3) });
            columnAnalysis[col] = await this.patternDetector.analyzeDataPatterns(
              columnValues, 
              col, 
              `User is asking: "${userQuestion}"`
            );
          } catch (error) {
            this.log('warning', `⚠️ Pattern analysis failed for column ${col}`, { error: error.message });
            console.warn(`Pattern analysis failed for column ${col}:`, error);
          }
        }
      }
      this.log('success', `✅ Column analysis complete for ${Object.keys(columnAnalysis).length} columns`, { analyzedColumns: Object.keys(columnAnalysis) });
    } else if (isDataTransformation) {
      this.log('info', '🔧 Skipping complex pattern analysis for data transformation task');
    } else {
      this.log('info', '⚡ Skipping column analysis - using direct row analysis for better performance');
    }

    const matchingRows = [];
    const totalRows = rows.length;
    let processed = 0;

    this.log('info', `🔄 Starting ${isColumnQuery ? 'column-aware' : isDataTransformation ? 'data-transformation' : 'holistic'} row processing of ${totalRows} rows...`);

    // Process each row
    for (const row of rows) {
      try {
        let hasMatch = false;
        let bestConfidence = 0;
        let bestReasoning = '';
        let matchDetails = {};

        if (isDataTransformation) {
          // Data transformation: direct task-focused processing
          this.log('info', `🔧 PROCESSING ROW ${processed + 1} AS TRANSFORMATION`, { rowData: Object.keys(row), userQuestion });
          const transformedRow = await this.dataTransformationAnalysis(row, userQuestion);
          this.log('debug', '✅ TRANSFORMATION COMPLETE FOR ROW', { transformedKeys: Object.keys(transformedRow || {}), confidence: transformedRow?.confidence });
          
          hasMatch = true; // Always include all rows for transformation tasks
          bestConfidence = transformedRow.confidence || 1.0;
          bestReasoning = transformedRow.reasoning || 'Data transformation applied';
          matchDetails = transformedRow;
        } else if (isColumnQuery) {
          // Column-specific analysis: check individual columns
          const relevantValues = Object.entries(row)
            .filter(([key, value]) => value != null && value !== '')
            .map(([key, value]) => ({ column: key, value: String(value) }));

          for (const { column, value } of relevantValues) {
            try {
              const patternMatch = await this.patternDetector.matchesPattern(
                value, 
                userQuestion, 
                `Column: ${column}, Pattern context: ${JSON.stringify(columnAnalysis[column]?.insights || {})}`
              );

              if (patternMatch.matches && patternMatch.confidence > bestConfidence) {
                hasMatch = true;
                bestConfidence = patternMatch.confidence;
                bestReasoning = patternMatch.reasoning;
                matchDetails = {
                  matchingColumn: column,
                  matchingValue: value,
                  patternInfo: columnAnalysis[column],
                  ...patternMatch
                };
              }
            } catch (error) {
              // Fallback to simple analysis if pattern detection fails
              const simpleMatch = await this.simpleRowAnalysis(row, userQuestion);
              if (simpleMatch.matches && simpleMatch.confidence > bestConfidence) {
                hasMatch = true;
                bestConfidence = simpleMatch.confidence;
                bestReasoning = simpleMatch.reasoning;
                matchDetails = simpleMatch;
              }
            }
          }
        } else {
          // Holistic row analysis: send entire row to AI
          const rowMatch = await this.simpleRowAnalysis(row, userQuestion);
          if (rowMatch.matches) {
            hasMatch = true;
            bestConfidence = rowMatch.confidence;
            bestReasoning = rowMatch.reasoning;
            matchDetails = rowMatch;
          }
        }

        if (hasMatch) {
          this.log('success', `✅ Row ${processed + 1} ${isDataTransformation ? 'transformed' : 'matched'}! Confidence: ${(bestConfidence * 100).toFixed(1)}%`, {
            matchingColumn: matchDetails.matchingColumn,
            matchingValue: matchDetails.matchingValue,
            reasoning: bestReasoning
          });
          
          // For data transformation, use the transformed row directly
          if (isDataTransformation && matchDetails && typeof matchDetails === 'object') {
            // Remove confidence and reasoning from the actual data
            const { confidence, reasoning, ...transformedData } = matchDetails;
            matchingRows.push({
              ...transformedData,
              _aiAnalysis: {
                matches: true,
                confidence: bestConfidence,
                reasoning: bestReasoning,
                transformationType: 'data_transformation'
              }
            });
          } else {
            matchingRows.push({
              ...row,
              _aiAnalysis: {
                matches: true,
                confidence: bestConfidence,
                reasoning: bestReasoning,
                matchDetails: matchDetails
              }
            });
          }
        } else {
          if (processed % 10 === 0) { // Log every 10th row to avoid spam
            this.log('debug', `Processing progress: ${processed + 1}/${totalRows} rows`);
          }
        }
        
        processed++;
        
        // Rate limiting - shorter delay for holistic analysis
        await this.sleep(isColumnQuery ? 300 : 200);
        
      } catch (error) {
        this.log('error', `❌ Failed to analyze row ${processed + 1}: ${error.message}`);
        console.warn(`Failed to analyze row ${processed}:`, error);
        processed++;
      }
    }

    this.log('info', `🎯 Row processing complete: ${matchingRows.length} matches found out of ${totalRows} total rows`);
    this.log('info', '🧠 Generating final insights...');

    const insights = await this.generateRowAnalysisInsights(matchingRows, columnAnalysis, userQuestion);
    
    this.log('success', '🎉 Row-by-row AI analysis complete!', {
      totalProcessed: totalRows,
      totalMatches: matchingRows.length,
      matchRate: `${((matchingRows.length / totalRows) * 100).toFixed(1)}%`,
      analysisType: isColumnQuery ? 'column-specific' : 'holistic'
    });

    return {
      method: 'row_by_row_ai',
      matches: matchingRows,
      total: totalRows,
      columnAnalysis: columnAnalysis,
      summary: `Found ${matchingRows.length} matching rows out of ${totalRows} total rows using ${isColumnQuery ? 'column-aware' : 'holistic'} AI analysis.`,
      insights: insights
    };
  }

  /**
   * Determine if the user question is asking about specific columns
   */
  isColumnSpecificQuery(userQuestion) {
    const columnKeywords = [
      'column', 'columns', 'field', 'fields', 'attribute', 'attributes',
      'what columns', 'which columns', 'columns contain', 'columns have',
      'fields contain', 'fields have', 'attributes contain', 'attributes have'
    ];
    
    const lowerQuestion = userQuestion.toLowerCase();
    return columnKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Dynamically determine if this is a data transformation request using AI
   */
  async isDataTransformationQuery(userQuestion, schema, sampleData) {
    this.log('info', `🔍 TRANSFORMATION DETECTION: Starting analysis for question: "${userQuestion}"`);
    
    const prompt = `Analyze this user request and determine if it's asking for data transformation:

User Question: "${userQuestion}"

Dataset Info:
- Columns: ${schema.map(col => `${col.name} (${col.type})`).join(', ')}
- Sample Data: ${sampleData.slice(0, 2).map((row, i) => `Row ${i + 1}: ${row.join(', ')}`).join('; ')}

A data transformation request is when the user wants to:
- Modify, calculate, or process the actual data values
- Return a modified version of the dataset
- Perform mathematical operations on the data
- Parse or restructure data formats
- Transform the entire sheet/dataset

Examples of transformation requests:
- "Sum semicolon-separated values and return the sheet"
- "The last three columns are numbers split by a semi colon, please sum the numbers of each cell and return the whole sheet back"
- "Convert dates to different format"
- "Calculate totals for each row"
- "Parse JSON fields and flatten"
- "Return the sheet with uppercase text"

Examples of NON-transformation requests:
- "Find all rows containing French text" (filtering/searching)
- "Show me duplicate records" (analysis)
- "Count how many rows have high values" (aggregation)

IMPORTANT: Pay special attention to requests about:
- Semicolon-separated values/numbers
- Mathematical operations on delimited data
- Requests to "return the whole sheet" or "return back"
- Data parsing and transformation

IMPORTANT: Return ONLY valid JSON with properly escaped strings.

IMPORTANT: Return ONLY valid JSON with properly escaped strings.

Respond with JSON:
{
  "isTransformation": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this is or isn't a transformation request",
  "transformationType": "mathematical|textual|structural|parsing|other" or null
}`;

    try {
      this.log('debug', '🤖 TRANSFORMATION DETECTION: Sending prompt to AI', { questionLength: userQuestion.length, promptLength: prompt.length });
      
      const response = await this.callOpenAI(prompt, 0.1);
      this.log('debug', '📝 TRANSFORMATION DETECTION: AI response received', { responseLength: response.content?.length });
      
      const result = this.parseJSONResponse(response.content);
      this.log('info', `🎯 TRANSFORMATION DETECTION RESULT: ${result.isTransformation} (confidence: ${(result.confidence * 100).toFixed(1)}%)`, { 
        result, 
        reasoning: result.reasoning,
        transformationType: result.transformationType 
      });
      
      const shouldTransform = result.isTransformation && result.confidence > 0.7;
      this.log(shouldTransform ? 'success' : 'info', `🔧 TRANSFORMATION DECISION: ${shouldTransform ? 'WILL TRANSFORM' : 'WILL NOT TRANSFORM'}`, {
        threshold: 0.7,
        actualConfidence: result.confidence,
        decision: shouldTransform
      });
      
      return shouldTransform;
    } catch (error) {
      this.log('warning', '⚠️ TRANSFORMATION DETECTION: AI failed, using fallback keyword detection', { error: error.message });
      
      // Fallback to simple keyword detection
      const transformKeywords = ['sum', 'calculate', 'transform', 'convert', 'return the whole sheet', 'return back', 'semicolon', 'semi colon'];
      const hasKeyword = transformKeywords.some(keyword => userQuestion.toLowerCase().includes(keyword));
      
      this.log('info', `🔍 TRANSFORMATION FALLBACK: ${hasKeyword ? 'DETECTED' : 'NOT DETECTED'} transformation keywords`, {
        keywords: transformKeywords,
        userQuestion: userQuestion.toLowerCase(),
        decision: hasKeyword
      });
      
      return hasKeyword;
    }
  }

  /**
   * Dynamic data transformation analysis - adapts to any transformation request
   */
  async dataTransformationAnalysis(row, userQuestion) {
    const rowData = Object.entries(row)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');

    // First, understand what transformation is needed
    const analysisPrompt = `Analyze this transformation request and determine what operations to perform:

User Request: "${userQuestion}"
Row Data: ${rowData}

What specific transformations should be applied to this row? Consider:
- Mathematical operations (sum, average, multiply, etc.)
- Text processing (uppercase, lowercase, parsing, etc.)
- Data format changes (date formats, number formats, etc.)
- Data parsing (JSON, CSV, delimited values, etc.)
- Structural changes (combine columns, split columns, etc.)

IMPORTANT: Return ONLY valid JSON with properly escaped strings.

Respond with JSON:
{
  "operations": [
    {
      "column": "column_name",
      "operation": "sum_delimited|uppercase|parse_json|calculate|format_date|etc",
      "details": "specific operation details",
      "delimiter": ";" or null,
      "target_format": "desired output format"
    }
  ],
  "returnWholeRow": true/false,
  "preserveOriginalColumns": true/false
}`;

    try {
      const analysisResult = await this.callOpenAI(analysisPrompt, 0.1);
      const analysis = this.parseJSONResponse(analysisResult.content);
      
      this.log('debug', '🔧 Transformation plan generated', analysis);

      // Now perform the actual transformation
      const transformPrompt = `Transform this row according to the analysis:

User Request: "${userQuestion}"
Row Data: ${rowData}

Transformation Plan: ${this.safeStringify(analysis)}

INSTRUCTIONS:
- Follow the transformation plan exactly
- For mathematical operations, be precise with arithmetic
- For text operations, maintain data integrity
- Return the complete transformed row
- Preserve original column names unless specifically requested to change them
- If returning whole row, include ALL columns (transformed and untransformed)

Respond with JSON containing the transformed row plus metadata:
{
  ...transformed_row_data,
  "confidence": 0.95,
  "reasoning": "Brief description of what was transformed",
  "operations_applied": ["list", "of", "operations"]
}`;

      const result = await this.callOpenAI(transformPrompt, 0.1);
      return this.parseJSONResponse(result.content);
      
    } catch (error) {
      this.log('warning', '⚠️ Dynamic transformation failed, using simple approach');
      
      // Fallback to simple transformation
      const fallbackPrompt = `Transform this row: "${userQuestion}"

Row data: ${rowData}

Apply the requested transformation and return the complete row as JSON.
For semicolon-separated numbers, sum them. For text operations, apply as requested.
Be precise and include all columns.`;

      const result = await this.callOpenAI(fallbackPrompt, 0.2);
      return this.parseJSONResponse(result.content);
    }
  }

  /**
   * Simple row analysis fallback
   */
  async simpleRowAnalysis(row, userQuestion) {
    const rowData = Object.entries(row)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');

    const prompt = `Does this row meet the criteria: "${userQuestion}"

Row data: ${rowData}

IMPORTANT: Return ONLY valid JSON with properly escaped strings.

Respond with JSON:
{
  "matches": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

    const result = await this.callOpenAI(prompt, 0.2);
    return this.parseJSONResponse(result.content);
  }

  /**
   * Generate insights from row analysis
   */
  async generateRowAnalysisInsights(matchingRows, columnAnalysis, userQuestion) {
    if (matchingRows.length === 0) {
      return { summary: "No matching rows found", insights: [] };
    }

    const prompt = `Analyze these matching rows and provide insights:

User Question: "${userQuestion}"
Found ${matchingRows.length} matching rows

Column Analysis:
${Object.entries(columnAnalysis).map(([col, analysis]) => 
  `${col}: ${analysis.dataType} (${analysis.insights?.quality || 'unknown quality'})`
).join('\n')}

Sample Matches:
${matchingRows.slice(0, 5).map((row, i) => {
  const analysis = row._aiAnalysis;
  return `${i + 1}. ${analysis.matchDetails?.matchingColumn}: "${analysis.matchDetails?.matchingValue}" (confidence: ${analysis.confidence})`;
}).join('\n')}

Provide insights in JSON:
{
  "summary": "Key findings summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "patterns": ["pattern 1", "pattern 2"],
  "dataQuality": "assessment of data quality",
  "recommendations": "what to do next"
}`;

    try {
      const result = await this.callOpenAI(prompt, 0.3);
      return this.parseJSONResponse(result.content);
    } catch (error) {
      return { 
        summary: `Found ${matchingRows.length} matching rows`, 
        insights: ["Analysis completed successfully"],
        recommendations: "Review the matching rows for detailed results"
      };
    }
  }

  /**
   * Method 2: Batch AI analysis
   */
  async executeBatchAI(userQuestion, schema, database, strategy) {
    const conn = await database.connect();
    const result = await conn.query("SELECT * FROM excel_data");
    await conn.close();
    
    if (!result.numRows) return { batches: [], summary: "No data found" };

    // Use DuckDB's toArray() method to properly extract values
    const rawArray = result.toArray();
    const columns = result.schema.fields.map(f => f.name);
    
    // rawArray already contains properly formatted objects!
    const rows = rawArray.map(row => {
      // Clean up quoted numbers like "46" -> 46 and handle BigInt values
      const cleanRow = {};
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'bigint') {
          // Convert BigInt to regular number or string if too large
          cleanRow[key] = value <= Number.MAX_SAFE_INTEGER ? Number(value) : value.toString();
        } else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          cleanRow[key] = value.slice(1, -1);
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });

    const batchSize = strategy.batchSize || 10;
    const batches = [];
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const batchData = batch.map((row, idx) => 
        `Row ${i + idx + 1}: ${Object.entries(row).map(([k,v]) => `${k}="${v}"`).join(', ')}`
      ).join('\n');

      const prompt = `${strategy.aiPrompt || `Analyze this batch of data for: "${userQuestion}"`}

Batch data:
${batchData}

Provide analysis in JSON:
{
  "findings": ["finding 1", "finding 2", ...],
  "matchingRowNumbers": [1, 3, 5],
  "insights": "Key insights from this batch"
}`;

      try {
        const result = await this.callOpenAI(prompt, 0.3);
        const analysis = this.parseJSONResponse(result.content);
        
        batches.push({
          batchNumber: Math.floor(i / batchSize) + 1,
          startRow: i + 1,
          endRow: Math.min(i + batchSize, rows.length),
          analysis: analysis,
          data: batch
        });
        
        await this.sleep(1000);
        
      } catch (error) {
        console.warn(`Failed to analyze batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    return {
      method: 'batch_ai',
      batches: batches,
      summary: `Analyzed ${rows.length} rows in ${batches.length} batches using AI.`
    };
  }

  /**
   * Validate SQL query for common GROUP BY errors
   */
  validateSQLQuery(sqlQuery) {
    if (!sqlQuery) return { valid: true };

    const query = sqlQuery.toUpperCase();
    
    // Check if query has aggregate functions
    const aggregateFunctions = ['SUM(', 'COUNT(', 'AVG(', 'MIN(', 'MAX(', 'STRING_AGG(', 'LIST_SUM('];
    const hasAggregates = aggregateFunctions.some(func => query.includes(func));
    
    // Check if query has GROUP BY
    const hasGroupBy = query.includes('GROUP BY');
    
    if (hasAggregates && !hasGroupBy) {
      // If we have aggregates but no GROUP BY, suggest adding GROUP BY or using window functions
      return {
        valid: false,
        error: 'Query contains aggregate functions but no GROUP BY clause. Either add GROUP BY or use window functions.',
        suggestion: 'Add GROUP BY clause for all non-aggregate columns, or use ANY_VALUE() for columns you want to display but not group by.'
      };
    }
    
    return { valid: true };
  }

  /**
   * Attempt to automatically fix SQL GROUP BY errors
   */
  async attemptSQLFix(originalQuery, validation, schema, userQuestion) {
    this.log('info', '🔧 Attempting to auto-fix SQL query...');
    
    try {
      const fixPrompt = `Fix this SQL query that has GROUP BY errors:

ORIGINAL QUERY (has errors):
${originalQuery}

ERROR: ${validation.error}
SUGGESTION: ${validation.suggestion}

SCHEMA:
${schema.map(col => `- ${col.name} (${col.type})`).join('\n')}

RULES TO FIX:
1. If the query has aggregate functions (SUM, COUNT, AVG, etc.) but no GROUP BY:
   - Add GROUP BY clause with all non-aggregate columns from SELECT
   - OR use ANY_VALUE(column) for columns you want to show but not group by
2. Every column in SELECT that is not an aggregate function must be in GROUP BY
3. Use table name "excel_data"
4. Keep the same intent as the original query

USER QUESTION: ${userQuestion}

Return ONLY the corrected SQL query, no explanation:`;

      const response = await this.callOpenAI(fixPrompt, 0.1);
      const fixedQuery = response.content.trim();
      
      // Basic validation that the response looks like SQL
      if (fixedQuery.toUpperCase().includes('SELECT') && 
          fixedQuery.toUpperCase().includes('FROM')) {
        return fixedQuery;
      }
      
      return null;
    } catch (error) {
      this.log('warning', `⚠️ Failed to auto-fix SQL query: ${error.message}`);
      return null;
    }
  }

  /**
   * Method 3: SQL computational analysis
   */
  async executeSQLComputational(userQuestion, schema, database, strategy) {
    this.log('info', '🔢 Executing SQL computational analysis...', { query: strategy.sqlQuery });
    
    try {
      // Validate SQL query before execution
      const validation = this.validateSQLQuery(strategy.sqlQuery);
      if (!validation.valid) {
        this.log('warning', `⚠️ SQL validation failed: ${validation.error}`);
        
        // Try to automatically fix common GROUP BY issues
        const fixedQuery = await this.attemptSQLFix(strategy.sqlQuery, validation, schema, userQuestion);
        if (fixedQuery) {
          this.log('info', '🔧 Attempting to use auto-corrected SQL query', { 
            original: strategy.sqlQuery, 
            fixed: fixedQuery 
          });
          strategy.sqlQuery = fixedQuery;
        } else {
          throw new Error(`SQL validation failed: ${validation.error}. ${validation.suggestion || ''}`);
        }
      }
      
      this.log('debug', '📝 Running SQL query', { sqlQuery: strategy.sqlQuery });
      const conn = await database.connect();
      const result = await conn.query(strategy.sqlQuery);
      await conn.close();
      
      if (!result.numRows) {
        this.log('warning', '⚠️ SQL query returned no results');
        return {
          method: 'sql_computational',
          results: [],
          summary: "No results found from SQL query."
        };
      }
      
      // Limit results to prevent token overflow (max 1000 rows for computational analysis)
      const maxRows = 1000;
      if (result.numRows > maxRows) {
        this.log('warning', `⚠️ Large result set (${result.numRows} rows), limiting to first ${maxRows} rows to prevent token overflow`);
      }
      
      this.log('success', '✅ SQL query executed successfully', { resultCount: result.numRows, limitedTo: Math.min(result.numRows, maxRows) });

      // Use DuckDB's toArray() method to properly extract values
      const rawArray = result.toArray();
      const columns = result.schema.fields.map(f => f.name);
      
      console.log('AI SERVICE: DuckDB toArray result:', rawArray.slice(0, 2));
      console.log('AI SERVICE: columns:', columns);
      
      // Limit the data to prevent token overflow
      const limitedArray = rawArray.slice(0, maxRows);
      
      // rawArray already contains properly formatted objects!
      const formattedResults = limitedArray.map(row => {
        // Clean up quoted numbers like "46" -> 46 and handle BigInt values
        const cleanRow = {};
        Object.entries(row).forEach(([key, value]) => {
          if (typeof value === 'bigint') {
            // Convert BigInt to regular number or string if too large
            cleanRow[key] = value <= Number.MAX_SAFE_INTEGER ? Number(value) : value.toString();
          } else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            cleanRow[key] = value.slice(1, -1);
          } else {
            cleanRow[key] = value;
          }
        });
        return cleanRow;
      });
      
      this.log('debug', 'DuckDB SQL Results processed', {
        numRows: result.numRows,
        fieldNames: result.schema.fields.map(f => f.name),
        firstRowSample: formattedResults[0]
      });

      // Generate AI insights about the SQL results (limit to first 20 rows for analysis)
      const sampleSize = Math.min(20, formattedResults.length);
      const sampleResults = formattedResults.slice(0, sampleSize);
      const truncationNote = formattedResults.length > sampleSize ? ` (showing first ${sampleSize} of ${formattedResults.length} results)` : '';
      
      const insightsPrompt = `Question: "${userQuestion}"
SQL Results${truncationNote}: ${this.safeStringify(sampleResults, 2)}

Provide insights in JSON:
{
  "summary": "Brief summary of findings",
  "insights": ["insight 1", "insight 2"],
  "directAnswer": "Direct answer to the user's question"
}`;

      const insights = await this.callOpenAI(insightsPrompt, 0.2);
      const analysis = this.parseJSONResponse(insights.content);

      this.log('success', '🎉 SQL computational analysis complete!', {
        resultCount: formattedResults.length,
        summary: analysis.directAnswer
      });

      return {
        method: 'sql_computational',
        sqlQuery: strategy.sqlQuery,
        results: formattedResults,
        analysis: analysis,
        summary: analysis.directAnswer || `SQL query returned ${formattedResults.length} results.`
      };
      
    } catch (error) {
      this.log('error', `❌ SQL execution failed: ${error.message}`, {
        sqlQuery: strategy.sqlQuery,
        error: error.message,
        sqliteError: true
      });
      
      // Provide helpful error message based on common SQLite issues
      let helpfulMessage = error.message;
      if (error.message.includes('REGEXP_REPLACE')) {
        helpfulMessage = 'REGEXP_REPLACE is not supported in SQLite. Use REPLACE(string, old, new) instead.';
      } else if (error.message.includes('INSTR')) {
        helpfulMessage = 'INSTR function syntax error. Use INSTR(string, substring) with exactly 2 arguments.';
      } else if (error.message.includes('REGEXP') || error.message.includes('MATCH')) {
        helpfulMessage = 'Regular expression functions are not supported. Use LIKE with % wildcards instead.';
      } else if (error.message.includes('no such table')) {
        helpfulMessage = 'Table not found. Make sure to use the table name "excel_data".';
      }
      
      throw new Error(`SQL execution failed: ${helpfulMessage}`);
    }
  }

  /**
   * Method 4: Hybrid analysis (SQL + AI)
   */
  async executeHybrid(userQuestion, schema, database, strategy) {
    // First run SQL to filter data
    const sqlResult = await this.executeSQLComputational(userQuestion, schema, database, strategy);
    
    // Then run AI analysis on the subset
    if (sqlResult.results.length > 0 && sqlResult.results.length <= 100) {
      // Small enough for detailed AI analysis
      const aiPrompt = `Analyze these SQL results for: "${userQuestion}"
      
Results: ${this.safeStringify(sqlResult.results.slice(0, 20), 2)}

Provide detailed analysis in JSON:
{
  "patterns": ["pattern 1", "pattern 2"],
  "insights": ["insight 1", "insight 2"],
  "conclusion": "Final conclusion",
  "recommendations": "What to do next"
}`;

      const aiResult = await this.callOpenAI(aiPrompt, 0.3);
      const aiAnalysis = this.parseJSONResponse(aiResult.content);

      return {
        method: 'hybrid',
        sqlResults: sqlResult,
        aiAnalysis: aiAnalysis,
        summary: `Found ${sqlResult.results.length} results with SQL, then analyzed with AI for deeper insights.`
      };
    }

    return sqlResult; // Just return SQL results if too many for AI
  }

  /**
   * Utility: Call OpenAI API
   */
  async callOpenAI(prompt, temperature = 0.2) {
    // GPT-5 models only support default temperature (1)
    const isGPT5Model = this.model.toLowerCase().includes('gpt-5') || this.model.toLowerCase().includes('o4-mini');
    const finalTemperature = isGPT5Model ? 1 : temperature;
    
    this.log('debug', `🌡️ Using temperature: ${finalTemperature} (GPT-5 model: ${isGPT5Model})`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: finalTemperature
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key and try again.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content?.trim() || '',
      usage: data.usage
    };
  }

  /**
   * Utility: Parse JSON response with markdown handling
   */
  parseJSONResponse(content) {
    if (!content) throw new Error('Empty response from OpenAI');
    
    let cleanContent = content.trim();
    
    // Handle markdown code blocks
    if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(7, -3).trim();
    } else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(3, -3).trim();
    }
    
    // Handle responses that start with explanatory text before JSON
    const jsonStartIndex = cleanContent.indexOf('{');
    const jsonEndIndex = cleanContent.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
      cleanContent = cleanContent.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    // Handle array responses
    if (!cleanContent.startsWith('{') && cleanContent.includes('[')) {
      const arrayStartIndex = cleanContent.indexOf('[');
      const arrayEndIndex = cleanContent.lastIndexOf(']');
      if (arrayStartIndex !== -1 && arrayEndIndex !== -1) {
        cleanContent = cleanContent.substring(arrayStartIndex, arrayEndIndex + 1);
      }
    }
    
    // CRITICAL: Pre-process complex nested structures before general fixing
    // This handles cases where we have arrays of objects that can break parsing
    cleanContent = this.preprocessComplexJSON(cleanContent);
    
    // Fix common JSON issues
    cleanContent = this.fixJSONEscaping(cleanContent);
    
    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      // Try to recover from JSON parsing errors
      this.log('warning', `⚠️ JSON parsing failed, attempting recovery`, { 
        error: error.message, 
        position: error.message.match(/position (\d+)/)?.[1],
        contentLength: cleanContent.length
      });
      
      // CRITICAL: Try aggressive SQL query extraction if this looks like a SQL query error
      if (cleanContent.includes('"sqlQuery"') && error.message.includes('position')) {
        const aggressivelyFixed = this.aggressiveSQLQueryExtraction(cleanContent, error);
        if (aggressivelyFixed) {
          try {
            const result = JSON.parse(aggressivelyFixed);
            this.log('success', '✅ Successfully recovered with aggressive SQL extraction');
            return result;
          } catch (e) {
            this.log('debug', 'Aggressive SQL extraction failed, trying general recovery');
          }
        }
      }
      
      const recoveredJSON = this.attemptJSONRecovery(cleanContent, error);
      if (recoveredJSON) {
        this.log('success', '✅ Successfully recovered from JSON parsing error');
        return recoveredJSON;
      }
      
      console.error('JSON parsing failed for content:', cleanContent);
      console.error('Original content:', content);
      console.error('Parse error:', error.message);
      throw new Error(`Failed to parse JSON from OpenAI: ${error.message}`);
    }
  }

  /**
   * Pre-process complex JSON structures that might cause parsing issues
   * Specifically handles nested arrays and objects like directAnswer.table
   */
  preprocessComplexJSON(content) {
    try {
      // Handle the specific case where we have nested arrays of objects
      // This is common in responses with "table" fields containing arrays
      
      // Look for patterns like: "table": [ { "key": value, "key2": value2 }, { ... } ]
      // The issue is often missing commas between array elements or object properties
      
      let processed = content;
      
      // Fix missing commas between array elements in table structures
      // Pattern: } { -> }, {
      processed = processed.replace(/}\s*{/g, '}, {');
      
      // Fix improperly escaped quotes in array elements (common AI mistake)
      // Pattern: "text", \"more text\" -> "text", "more text"
      processed = processed.replace(/,\s*\\"/g, ', "');
      processed = processed.replace(/\[\s*\\"/g, '[ "');
      processed = processed.replace(/\\"(\s*[,\]])/g, '"$1');
      
      // Fix malformed array elements: [ {, -> [ {
      processed = processed.replace(/\[\s*\{\s*,/g, '[ {');
      
      // Fix missing commas between object properties
      // Pattern: "value" "property": -> "value", "property":
      processed = processed.replace(/("\s*)\s+"/g, '$1, "');
      
      // Handle specific issues with table arrays
      if (processed.includes('"table"')) {
        // Find the table section
        const tableStart = processed.indexOf('"table":');
        if (tableStart !== -1) {
          const afterTable = processed.substring(tableStart);
          const arrayStart = afterTable.indexOf('[');
          const arrayEnd = afterTable.lastIndexOf(']');
          
          if (arrayStart !== -1 && arrayEnd !== -1) {
            const beforeTable = processed.substring(0, tableStart);
            const tableSection = afterTable.substring(0, arrayEnd + 1);
            const afterTableSection = afterTable.substring(arrayEnd + 1);
            
            // Fix the table section specifically
            let fixedTableSection = tableSection
              // Ensure proper comma separation between array elements
              .replace(/}\s*,?\s*{/g, '}, {')
              // Fix missing commas between properties within objects
              .replace(/("(?:[^"\\]|\\.)*")\s+("(?:[^"\\]|\\.)*":\s*)/g, '$1, $2')
              // Fix numeric values followed by property names
              .replace(/(\d+(?:\.\d+)?)\s+("(?:[^"\\]|\\.)*":\s*)/g, '$1, $2')
              // Fix null values followed by property names
              .replace(/(null)\s+("(?:[^"\\]|\\.)*":\s*)/g, '$1, $2')
              // Clean up any double commas
              .replace(/,,+/g, ',')
              // Fix trailing commas before closing braces
              .replace(/,(\s*})/g, '$1');
            
            processed = beforeTable + fixedTableSection + afterTableSection;
          }
        }
      }
      
      // Additional fixes for array structures
      processed = processed
        // Fix missing commas between array elements (general case)
        .replace(/]\s*,?\s*\[/g, '], [')
        // Fix missing commas between string values in arrays
        .replace(/("\s*)\s*,?\s*"/g, '$1, "')
        // Clean up any resulting double commas
        .replace(/,,+/g, ',')
        // Remove trailing commas before closing brackets/braces
        .replace(/,(\s*[\]}])/g, '$1');
      
      this.log('debug', '🔧 Preprocessed complex JSON structure', {
        originalLength: content.length,
        processedLength: processed.length,
        hasTable: processed.includes('"table"'),
        changesMade: content !== processed
      });
      
      return processed;
      
    } catch (error) {
      this.log('warning', `⚠️ Complex JSON preprocessing failed: ${error.message}`);
      return content;
    }
  }

  /**
   * Fix common JSON escaping issues
   */
  fixJSONEscaping(content) {
    let fixed = content
      // Remove line continuation backslashes that break JSON
      .replace(/\\\s*\n\s*/g, ' ')
      // Fix malformed escape sequences at end of property values
      // Pattern: "value\" should become "value"
      .replace(/([^\\])\\"(\s*,\s*\\?")/g, '$1"$2')
      .replace(/([^\\])\\"(\s*,\s*")/g, '$1"$2')
      // Fix broken escape sequences in property values like "hybrid\" -> "hybrid"
      .replace(/"([^"]*)\\"(\s*,\s*\\?"[^"]*":\s*)/g, '"$1"$2')
      .replace(/"([^"]*)\\"(\s*,\s*"[^"]*":\s*)/g, '"$1"$2');

    // CRITICAL: Fix unescaped quotes inside JSON string values
    // This is a complex fix that preserves JSON structure while escaping internal quotes
    fixed = this.fixInternalQuotes(fixed);
    
    // Enhanced fixing for complex patterns
    fixed = fixed
      // Fix SQL-specific escaping issues first (before general fixes)
      .replace(/\\{3,}"/g, '\\"')                               // Fix triple+ backslash quotes
      .replace(/\\\\"(\w+)\\\\"([^"])/g, '\\"$1\\"$2')         // Fix double-escaped column names
      
      // Fix common escaping issues in strings
      .replace(/\\(?!["\\/bfnrt])/g, '\\\\')                   // Escape backslashes not followed by valid escape chars
      
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      
      // Fix missing commas between properties (enhanced patterns)
      .replace(/"\s*\n\s*"/g, '",\n  "')
      .replace(/"\s*(?!\s*[:\]}])\s*"/g, '", "')              // More precise pattern
      
      // Clean up multiple spaces but preserve structure
      .replace(/\s+/g, ' ')
      
      // Ensure proper spacing around colons and commas
      .replace(/"\s*:\s*/g, '": ')
      .replace(/,\s*/g, ', ')
      
      // Fix any remaining missing commas between JSON properties
      .replace(/}(\s*)"(\w+)"/g, '},\n  "$2"')
      .replace(/"(\s*)"(\w+)"(\s*):/g, '",\n  "$2": ');

    // Enhanced pattern matching for property separation issues
    // Look for property values followed directly by property names without commas
    fixed = fixed.replace(/("[\w-]+")\s+("[\w-]+"\s*:)/g, '$1, $2');
    
    // More comprehensive fix for missing commas between properties
    // This pattern catches: "value" "property": or "value"\n"property":
    fixed = fixed.replace(/(:\s*"[^"]*")\s+("[\w-]+"\s*:)/g, '$1, $2');
    fixed = fixed.replace(/(:\s*[^,}\]]+)\s+("[\w-]+"\s*:)/g, '$1, $2');
    
    // Fix case where there's a property value followed by whitespace and another property
    // Pattern: "key": "value" "nextKey": should become "key": "value", "nextKey":
    fixed = fixed.replace(/(:\s*"[^"]*")\s+("[\w-]+":\s*)/g, '$1, $2');
    
    // ENHANCED: Handle multiple specific error patterns
    // Pattern 1: "hybrid\", \"reasoning" -> "hybrid", "reasoning"
    fixed = fixed.replace(/"([^"\\]*)\\",\s*\\"/g, '"$1", "');
    fixed = fixed.replace(/"([^"\\]*)\\"(\s*,\s*)\\"([^"]*)":/g, '"$1"$2"$3":');
    
    // Pattern 2: Handle SQL queries with inconsistent escaping
    fixed = fixed.replace(/\\"(\w+)\\"\s*\\\\/g, '\\"$1\\"');  // Fix column names with trailing backslashes
    
    // Pattern 3: Fix cases where the AI adds extra quotes or escaping
    fixed = fixed.replace(/\\""\s*"/g, '", "');                 // Fix \""  "
    fixed = fixed.replace(/"\s*\\"\s*"/g, '", "');              // Fix " \" "
    
    // Pattern 4: Fix malformed array elements with leading commas
    fixed = fixed.replace(/\[\s*\{\s*,/g, '[ {');               // Fix [ {, -> [ {
    
    // Pattern 5: Fix improperly escaped quotes in arrays
    fixed = fixed.replace(/,\s*\\"/g, ', "');                   // Fix , \" -> , "
    fixed = fixed.replace(/\[\s*\\"/g, '[ "');                  // Fix [ \" -> [ "
    fixed = fixed.replace(/\\"(\s*[,\]])/g, '"$1');             // Fix \" followed by comma or bracket
    
    return fixed;
  }

  /**
   * Fix unescaped quotes inside JSON string values
   * This handles cases like: "text with "quoted" words inside"
   */
  fixInternalQuotes(content) {
    // Strategy: Find and fix common patterns of unescaped quotes inside JSON strings
    
    try {
      // SPECIAL HANDLING: Fix SQL queries in "sqlQuery" field
      // This is a complex pattern that needs special attention
      content = this.fixSQLQueries(content);
      
      // Pattern 1: Fix quotes inside parenthetical expressions
      // "(e.g., "CuraSpon")" -> "(e.g., \"CuraSpon\")"
      content = content.replace(/(\([^)]*)"([^"]*)"([^)]*\))/g, '$1\\"$2\\"$3');
      
      // Pattern 2: Fix quotes around product names or examples in text
      // " "ProductName" " -> " \"ProductName\" "
      content = content.replace(/(\s)"([^"]{1,50})"(\s)/g, '$1\\"$2\\"$3');
      
      // Pattern 3: Fix quotes in SQL examples and code snippets
      // More targeted approach for SQL strings
      content = content.replace(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY)([^"]*)"([^"]*)"([^"]*)(SELECT|FROM|WHERE|;|,|\s)/g, 
        '$1$2\\"$3\\"$4$5');
      
      // Pattern 4: Fix quotes in list-like structures  
      // ", "item1", "item2"," -> ", \"item1\", \"item2\","
      content = content.replace(/(,\s*)"([^"]{1,30})"(\s*,)/g, '$1\\"$2\\"$3');
      
      return content;
    } catch (error) {
      // If our regex fixes cause issues, return the original content
      console.warn('Error in fixInternalQuotes:', error);
      return content;
    }
  }

  /**
   * Aggressive SQL query extraction for severely malformed JSON
   * This method attempts to reconstruct valid JSON when SQL queries break the structure
   */
  aggressiveSQLQueryExtraction(content, error) {
    try {
      this.log('info', '🚨 Attempting aggressive SQL query extraction...');
      
      // Extract the position of the error
      const positionMatch = error.message.match(/position (\d+)/);
      if (!positionMatch) return null;
      
      const errorPosition = parseInt(positionMatch[1]);
      
      // Try to identify all JSON fields and reconstruct them properly
      const fields = {
        method: null,
        reasoning: null,
        sqlQuery: null,
        aiPrompt: null,
        batchSize: null,
        expectedResults: null
      };
      
      // Extract each field with more robust pattern matching
      Object.keys(fields).forEach(fieldName => {
        // Look for the field in the content
        const fieldPattern = new RegExp(`"${fieldName}":\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'g');
        let match = fieldPattern.exec(content);
        
        // If standard pattern fails, try more permissive extraction
        if (!match && fieldName === 'sqlQuery') {
          // For SQL queries, be extra permissive
          const sqlStart = content.indexOf('"sqlQuery":');
          if (sqlStart !== -1) {
            const afterStart = content.substring(sqlStart);
            // Find the start of the quote
            const quoteStart = afterStart.indexOf('"', '"sqlQuery":'.length);
            if (quoteStart !== -1) {
              // Find a reasonable end point - look for the next field or end of object
              const possibleEnds = [
                afterStart.indexOf('", "reasoning"'),
                afterStart.indexOf('", "aiPrompt"'),
                afterStart.indexOf('", "batchSize"'),
                afterStart.indexOf('", "expectedResults"'),
                afterStart.indexOf('"}'),
                afterStart.length - 1
              ].filter(pos => pos > quoteStart);
              
              if (possibleEnds.length > 0) {
                const endPos = Math.min(...possibleEnds);
                let sqlContent = afterStart.substring(quoteStart + 1, endPos);
                
                // Clean up the SQL content
                sqlContent = sqlContent
                  .replace(/\\+"/g, '\\"')           // Normalize escaping
                  .replace(/,\s*$/, '')              // Remove trailing commas
                  .replace(/\s+/g, ' ')              // Normalize whitespace
                  .trim();
                
                fields[fieldName] = sqlContent;
              }
            }
          }
        } else if (match) {
          fields[fieldName] = match[1];
        }
        
        // Try alternative patterns for non-string values
        if (!fields[fieldName] && (fieldName === 'batchSize')) {
          const numPattern = new RegExp(`"${fieldName}":\\s*(\\d+)`, 'g');
          const numMatch = numPattern.exec(content);
          if (numMatch) {
            fields[fieldName] = parseInt(numMatch[1]);
          }
        }
      });
      
      // Reconstruct JSON with found fields
      const reconstructed = {};
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          reconstructed[key] = value;
        }
      });
      
      // Add default values for missing critical fields
      if (!reconstructed.method) {
        reconstructed.method = 'sql_computational'; // Most common for SQL queries
      }
      
      if (!reconstructed.reasoning) {
        reconstructed.reasoning = 'SQL-based computational analysis';
      }
      
      if (!reconstructed.batchSize) {
        reconstructed.batchSize = 10;
      }
      
      if (!reconstructed.expectedResults) {
        reconstructed.expectedResults = 'Computational analysis results';
      }
      
      this.log('debug', '🔧 Reconstructed JSON object', {
        foundFields: Object.keys(fields).filter(k => fields[k] !== null),
        reconstructedKeys: Object.keys(reconstructed)
      });
      
      return JSON.stringify(reconstructed);
      
    } catch (error) {
      this.log('warning', `⚠️ Aggressive SQL extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fix SQL queries that have malformed quotes
   */
  fixSQLQueries(content) {
    try {
      // Strategy 1: Simple regex-based fix for well-formed sqlQuery fields
      const sqlQueryMatch = content.match(/"sqlQuery":\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*,|\s*})/);
      if (sqlQueryMatch) {
        const originalSqlQuery = sqlQueryMatch[1];
        
        // Fix common SQL quote issues:
        let fixedQuery = originalSqlQuery
          // 1. Fix inconsistent escaping patterns
          .replace(/\\+"/g, '\\"')                    // Normalize quote escaping
          .replace(/\\{2,}/g, '\\\\')                 // Fix multiple backslashes
          
          // 2. Fix specific patterns that break JSON
          .replace(/\\\\"([^"]*)\\\\/g, '\\"$1\\"')   // Fix \\\"Column\"\\ -> \"Column\"
          .replace(/\\\\\"/g, '\\"')                   // Fix \\\" -> \"
          
          // 3. Fix trailing syntax errors
          .replace(/(ORDER BY[^,]*),\s*$/, '$1')       // Remove trailing comma after ORDER BY
          .replace(/(WHERE[^,]*),\s*$/, '$1')          // Remove trailing comma after WHERE
          .replace(/,\s*$/, '')                        // Remove any other trailing commas
          
          // 4. Fix quote consistency in column names
          .replace(/([^\\])"([A-Za-z_][A-Za-z0-9_]*)"([^"])/g, '$1\\"$2\\"$3') // Fix unescaped column quotes
          
          // 5. Fix specific SQL syntax issues
          .replace(/\s+/g, ' ')                        // Normalize whitespace
          .trim();                                     // Remove leading/trailing spaces
        
        // Replace the original query with the fixed one
        content = content.replace(sqlQueryMatch[0], `"sqlQuery": "${fixedQuery}"`);
        
        this.log('debug', '🔧 Fixed SQL query in JSON', { 
          original: originalSqlQuery.substring(0, 100) + '...', 
          fixed: fixedQuery.substring(0, 100) + '...' 
        });
        return content;
      }
      
      // Strategy 2: Handle severely malformed JSON where the SQL query breaks the structure
      // Look for sqlQuery field that's not properly closed
      const brokenSqlStart = content.indexOf('"sqlQuery":');
      if (brokenSqlStart !== -1) {
        const afterSqlStart = content.substring(brokenSqlStart);
        
        // Try to find the end of the JSON object
        const nextFieldMatch = afterSqlStart.match(/",\s*"([^"]+)":/);
        if (nextFieldMatch) {
          const nextFieldStart = afterSqlStart.indexOf(nextFieldMatch[0]);
          const sqlPart = afterSqlStart.substring(0, nextFieldStart);
          const restOfJson = afterSqlStart.substring(nextFieldStart);
          
          // Extract the SQL query content (everything between the first quote and before the next field)
          const sqlContentMatch = sqlPart.match(/"sqlQuery":\s*"(.*)$/);
          if (sqlContentMatch) {
            let sqlContent = sqlContentMatch[1];
            
            // Clean up the SQL content
            sqlContent = sqlContent
              .replace(/\\+"/g, '\\"')           // Fix quote escaping
              .replace(/,\s*$/, '')              // Remove trailing commas
              .replace(/\s+/g, ' ')              // Normalize whitespace
              .trim();                           // Remove leading/trailing spaces
            
            // Reconstruct the JSON
            const beforeSql = content.substring(0, brokenSqlStart);
            const fixedContent = beforeSql + `"sqlQuery": "${sqlContent}"` + restOfJson;
            
            this.log('debug', '🔧 Fixed severely malformed SQL query', { 
              originalLength: content.length,
              fixedLength: fixedContent.length
            });
            
            return fixedContent;
          }
        }
      }
      
      // Strategy 3: Additional fix for malformed patterns
      const brokenSqlMatch = content.match(/"sqlQuery":\s*"([^"]*(?:\\.[^"]*)*),\s*"/);
      if (brokenSqlMatch) {
        const brokenQuery = brokenSqlMatch[1];
        const fixedQuery = brokenQuery.replace(/,\s*$/, ''); // Remove trailing comma
        content = content.replace(brokenSqlMatch[0], `"sqlQuery": "${fixedQuery}"`);
        
        this.log('debug', '🔧 Fixed broken SQL query pattern', { 
          original: brokenQuery, 
          fixed: fixedQuery 
        });
      }
      
      return content;
    } catch (error) {
      console.warn('Error fixing SQL queries:', error);
      return content;
    }
  }

  /**
   * Attempt to recover from JSON parsing errors
   */
  attemptJSONRecovery(content, error) {
    try {
      // Extract position of error if available
      const positionMatch = error.message.match(/position (\d+)/);
      if (!positionMatch) return null;
      
      const errorPosition = parseInt(positionMatch[1]);
      const beforeError = content.substring(0, errorPosition);
      const afterError = content.substring(errorPosition);
      const errorChar = content[errorPosition];
      
      this.log('debug', '🔍 JSON Error Details', {
        errorPosition,
        errorChar,
        beforeError: beforeError.slice(-20),
        afterError: afterError.slice(0, 20),
        errorMessage: error.message
      });
      
      // Try different recovery strategies based on error type
      
      // Strategy 0A: Handle table array issues around position 806
      if (errorPosition >= 800 && errorPosition <= 820 && content.includes('"table"')) {
        this.log('debug', '🔧 Detected table array parsing issue around position 806');
        
        // Find the table section and fix it
        const tableStart = content.indexOf('"table":');
        if (tableStart !== -1 && tableStart < errorPosition) {
          const beforeTable = content.substring(0, tableStart);
          const afterTableStart = content.substring(tableStart);
          
          // Find the end of the table array
          let bracketCount = 0;
          let tableEnd = -1;
          let inQuotes = false;
          let escaped = false;
          
          for (let i = afterTableStart.indexOf('['); i < afterTableStart.length; i++) {
            const char = afterTableStart[i];
            
            if (escaped) {
              escaped = false;
              continue;
            }
            
            if (char === '\\') {
              escaped = true;
              continue;
            }
            
            if (char === '"' && !escaped) {
              inQuotes = !inQuotes;
              continue;
            }
            
            if (!inQuotes) {
              if (char === '[') {
                bracketCount++;
              } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  tableEnd = i + 1;
                  break;
                }
              }
            }
          }
          
          if (tableEnd !== -1) {
            const tableSection = afterTableStart.substring(0, tableEnd);
            const afterTable = afterTableStart.substring(tableEnd);
            
            // Fix the table section with aggressive comma insertion
            let fixedTableSection = tableSection
              .replace(/}\s*{/g, '}, {')                                    // Fix missing commas between objects
              .replace(/(\d+(?:\.\d+)?)\s+("[\w_]+"\s*:)/g, '$1, $2')      // Fix numeric values followed by property names
              .replace(/(null)\s+("[\w_]+"\s*:)/g, '$1, $2')               // Fix null values followed by property names
              .replace(/("[\w_]+"\s*:\s*"[^"]*")\s+("[\w_]+"\s*:)/g, '$1, $2')  // Fix string properties
              .replace(/("[\w_]+"\s*:\s*\d+(?:\.\d+)?)\s+("[\w_]+"\s*:)/g, '$1, $2')  // Fix property:number followed by property
              .replace(/("[\w_]+"\s*:\s*null)\s+("[\w_]+"\s*:)/g, '$1, $2')  // Fix property:null followed by property
              .replace(/,\s*,/g, ',')                                       // Fix double commas
              .replace(/,(\s*[}\]])/g, '$1');                              // Remove trailing commas
            
            const fixedContent = beforeTable + fixedTableSection + afterTable;
            
            try {
              return JSON.parse(fixedContent);
            } catch (e) {
              this.log('debug', '🔧 Table-specific recovery failed, trying general recovery');
            }
          }
        }
      }
      
      // Strategy 0B: Handle specific SQL query issues at position 372
      if (errorPosition >= 370 && errorPosition <= 380 && content.includes('"sqlQuery"')) {
        // This is likely the SQL query issue we've been seeing
        const sqlQueryStart = content.indexOf('"sqlQuery"');
        if (sqlQueryStart !== -1 && sqlQueryStart < errorPosition) {
          // Try to fix the entire sqlQuery field
          const beforeSql = content.substring(0, sqlQueryStart);
          const afterSqlStart = content.substring(sqlQueryStart);
          
          // Find the end of the sqlQuery value
          const sqlQueryEnd = afterSqlStart.search(/",\s*"(?!.*sqlQuery)/);
          if (sqlQueryEnd !== -1) {
            const sqlPart = afterSqlStart.substring(0, sqlQueryEnd + 1);
            const afterSql = afterSqlStart.substring(sqlQueryEnd + 1);
            
            // Fix the SQL part specifically
            let fixedSqlPart = sqlPart
              .replace(/\\{2,}"/g, '\\"')                   // Fix multiple backslash quotes
              .replace(/\\"(\w+)\\"/g, '\\"$1\\"')          // Fix column name escaping
              .replace(/,\s*$/, '')                         // Remove trailing commas
              .replace(/\s*,\s*"$/, '"');                   // Fix trailing comma before quote
            
            const fixedContent = beforeSql + fixedSqlPart + afterSql;
            try {
              return JSON.parse(fixedContent);
            } catch (e) {
              this.log('debug', '🔧 SQL-specific recovery failed, trying general recovery');
            }
          }
        }
      }
      
      // Strategy 1: Fix missing comma errors specifically
      if (error.message.includes("Expected ',' or '}'")) {
        // Check for malformed escape sequence like "hybrid\" at the error position
        if (beforeError.includes('\\"') && afterError.trim().startsWith(',')) {
          // Remove the erroneous backslash before the closing quote
          const fixedBefore = beforeError.replace(/\\"$/, '"');
          const fixedContent = fixedBefore + afterError;
          try {
            return JSON.parse(fixedContent);
          } catch (e) {
            // Continue to next strategy
          }
        }
        
        // This usually means a missing comma between properties
        if (beforeError.endsWith('"') && afterError.trim().startsWith('"')) {
          const fixedContent = beforeError + ', ' + afterError;
          try {
            return JSON.parse(fixedContent);
          } catch (e) {
            // Continue to next strategy
          }
        }
        
        // Alternative: Insert comma before the error position
        const insertCommaContent = content.substring(0, errorPosition) + ',' + content.substring(errorPosition);
        try {
          return JSON.parse(insertCommaContent);
        } catch (e) {
          // Continue to next strategy
        }
      }
      
      // Strategy 2: Handle bad escaped character errors
      if (error.message.includes("Bad escaped character")) {
        // Look at the character causing the issue
        if (errorChar === '"' && beforeError.endsWith('\\')) {
          // This is likely a case where \" is causing issues
          const fixedContent = beforeError.slice(0, -1) + '\\"' + afterError;
          try {
            return JSON.parse(fixedContent);
          } catch (e) {
            // Try removing the escape entirely
            const fixedContent2 = beforeError.slice(0, -1) + '"' + afterError;
            try {
              return JSON.parse(fixedContent2);
            } catch (e) {
              // Continue to next strategy
            }
          }
        }
      }
      
      // Strategy 3: Fix escaped character at error position
      let fixedContent = content;
      if (errorPosition < content.length) {
        const char = content[errorPosition];
        const prevChar = errorPosition > 0 ? content[errorPosition - 1] : '';
        
        // If it's a quote that's not properly escaped
        if (char === '"' && prevChar !== '\\') {
          fixedContent = content.substring(0, errorPosition) + '\\"' + content.substring(errorPosition + 1);
          try {
            return JSON.parse(fixedContent);
          } catch (e) {
            // Continue to next strategy
          }
        }
        
        // If it's a backslash that needs escaping
        if (char === '\\') {
          fixedContent = content.substring(0, errorPosition) + '\\\\' + content.substring(errorPosition + 1);
          try {
            return JSON.parse(fixedContent);
          } catch (e) {
            // Continue to next strategy
          }
        }
      }
      
      // Strategy 4: Try to fix the entire string by escaping all problematic chars
      fixedContent = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      // But restore proper JSON structure quotes
      fixedContent = fixedContent.replace(/\\"{/g, '"{').replace(/}\\"}/g, '}}');
      fixedContent = fixedContent.replace(/\\":/g, '":').replace(/:\\"([^"]*)\\"}/g, ':"$1"}');
      
      try {
        return JSON.parse(fixedContent);
      } catch (e) {
        // Strategy failed
      }
      
      // Strategy 5: Try to extract valid JSON substring
      const lastOpenBrace = beforeError.lastIndexOf('{');
      const nextCloseBrace = content.indexOf('}', errorPosition);
      
      if (lastOpenBrace !== -1 && nextCloseBrace !== -1) {
        const potentialJSON = content.substring(lastOpenBrace, nextCloseBrace + 1);
        try {
          return JSON.parse(potentialJSON);
        } catch (e) {
          // Strategy failed
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Execute dynamic categorization with intelligent reuse
   */
  async executeDynamicCategorization(data, predefinedCategories, context = '', onStatsUpdate = null, onCategoryUpdate = null, userPrompt = '') {
    this.log('info', '🏷️ Starting dynamic categorization process...', {
      dataItems: Array.isArray(data) ? data.length : 1,
      predefinedCategories: predefinedCategories.length
    });

    try {
      const result = await this.categoryManager.categorizeWithDynamicReuse(
        data, 
        predefinedCategories, 
        context,
        onCategoryUpdate,
        userPrompt
      );

      // Provide real-time statistics updates
      if (onStatsUpdate && typeof onStatsUpdate === 'function') {
        onStatsUpdate(result.categoryStats);
      }

      this.log('success', `✅ Dynamic categorization completed successfully`, {
        totalItems: result.results.length,
        totalCategories: result.categoryStats.totalCategories,
        newCategories: result.categoryStats.newCategories
      });

      return {
        method: 'dynamic_categorization',
        results: result.results,
        categoryStats: result.categoryStats,
        dynamicCategories: result.dynamicCategories,
        summary: `Categorized ${result.results.length} items into ${result.categoryStats.totalCategories} categories (${result.categoryStats.newCategories} created dynamically)`
      };

    } catch (error) {
      this.log('error', `❌ Dynamic categorization failed: ${error.message}`);
      throw new Error(`Dynamic categorization failed: ${error.message}`);
    }
  }

  /**
   * Enhanced executeRowByRowAI with dynamic categorization support
   */
  async executeRowByRowAIWithDynamicCategories(userQuestion, schema, database, strategy, options = {}) {
    this.log('info', '🔍 Starting enhanced row-by-row AI analysis with dynamic categories...', { 
      strategy: strategy.method,
      useDynamicCategories: options.useDynamicCategories || false
    });
    
    // First, get the regular row-by-row AI analysis
    const regularResult = await this.executeRowByRowAI(userQuestion, schema, database, strategy);
    
    // If dynamic categorization is not enabled, return regular results
    if (!options.useDynamicCategories || !options.predefinedCategories) {
      return regularResult;
    }

    // Extract data for categorization from the analysis results
    const dataToCategories = regularResult.rows.map(row => {
      // Create a meaningful string representation for categorization
      return Object.entries(row)
        .filter(([key, _]) => !key.startsWith('_')) // Exclude internal fields
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
    });

    // Perform dynamic categorization
    try {
      const categorizationResult = await this.executeDynamicCategorization(
        dataToCategories,
        options.predefinedCategories || [],
        `User query context: ${userQuestion}`,
        options.onStatsUpdate,
        options.onCategoryUpdate,
        options.userPrompt || ''
      );

      // Merge categorization results with the original analysis
      const enhancedRows = regularResult.rows.map((row, index) => ({
        ...row,
        _dynamicCategory: categorizationResult.results[index]?.category || 'Uncategorized',
        _categoryConfidence: categorizationResult.results[index]?.confidence || 0,
        _categoryReasoning: categorizationResult.results[index]?.reasoning || ''
      }));

      return {
        ...regularResult,
        rows: enhancedRows,
        categoryStats: categorizationResult.categoryStats,
        dynamicCategories: categorizationResult.dynamicCategories,
        method: 'enhanced_row_by_row_with_categories',
        summary: `${regularResult.summary} Enhanced with dynamic categorization: ${categorizationResult.summary}`
      };

    } catch (error) {
      this.log('warning', `⚠️ Dynamic categorization failed, returning regular results: ${error.message}`);
      return regularResult;
    }
  }

  /**
   * Get category manager for external access
   */
  getCategoryManager() {
    return this.categoryManager;
  }

  /**
   * Export categories for persistence
   */
  exportCategories() {
    return this.categoryManager.exportCategories();
  }

  /**
   * Import categories from previous session
   */
  importCategories(exportedData) {
    return this.categoryManager.importCategories(exportedData);
  }

  /**
   * Reset dynamic category data
   */
  resetCategories() {
    return this.categoryManager.reset();
  }

  /**
   * Utility: Sleep for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}