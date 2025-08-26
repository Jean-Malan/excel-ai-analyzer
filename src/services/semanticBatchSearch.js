/**
 * Semantic Batch Search Service
 * 
 * Provides contextual search capabilities using LLM batch processing.
 * Instead of pattern matching, uses LLM's understanding to find semantically relevant data.
 */

export class SemanticBatchSearchService {
  constructor(apiKey, model, logger = null) {
    this.apiKey = apiKey;
    this.model = model;
    this.log = logger || (() => {});
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Utility function to chunk array into batches
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate optimal batch size based on data complexity and row count
   */
  calculateOptimalBatchSize(totalRows, avgRowSize = 100) {
    // Base batch size on total rows and estimated token usage
    if (totalRows <= 100) return Math.max(10, Math.floor(totalRows / 4));
    if (totalRows <= 1000) return 25;
    if (totalRows <= 5000) return 35;
    return 50;
  }

  /**
   * Find the actual column name in the row data, handling common transformations
   */
  findActualColumnName(requestedColumn, availableColumns) {
    // Direct match first
    if (availableColumns.includes(requestedColumn)) {
      return requestedColumn;
    }
    
    // Try common transformations
    const transformations = [
      requestedColumn.replace(/ /g, '_'), // Space to underscore
      requestedColumn.replace(/_/g, ' '), // Underscore to space
      requestedColumn.replace(/ /g, ''),  // Remove spaces entirely
      requestedColumn.toLowerCase(),      // Lowercase
      requestedColumn.toUpperCase()       // Uppercase
    ];
    
    for (const transformed of transformations) {
      if (availableColumns.includes(transformed)) {
        return transformed;
      }
    }
    
    // Case-insensitive search
    const lowerRequested = requestedColumn.toLowerCase();
    const match = availableColumns.find(col => 
      col.toLowerCase() === lowerRequested ||
      col.toLowerCase().replace(/[_\s]/g, '') === lowerRequested.replace(/[_\s]/g, '')
    );
    
    return match || requestedColumn; // Return original if no match found
  }

  /**
   * Prepare row data for LLM analysis - create a concise representation
   */
  prepareRowForAnalysis(row, index, schema, searchColumns = null, returnColumns = null) {
    // Determine which columns to search (for semantic analysis) and which to return
    const columnsToSearch = searchColumns && searchColumns.length > 0 ? searchColumns : schema.map(col => col.name);
    const columnsToReturn = returnColumns && returnColumns.length > 0 ? returnColumns : schema.map(col => col.name);
    
    const availableColumns = Object.keys(row);
    
    // Create search data (only columns we want to analyze)
    const searchFields = {};
    columnsToSearch.forEach(requestedColName => {
      // Find the actual column name in the data
      const actualColName = this.findActualColumnName(requestedColName, availableColumns);
      const value = row[actualColName];
      
      // Include the column even if empty, but mark it appropriately
      if (value !== null && value !== undefined && value !== '') {
        // Truncate very long text fields for analysis
        if (typeof value === 'string' && value.length > 100) {
          searchFields[requestedColName] = value.substring(0, 100) + '...';
        } else {
          searchFields[requestedColName] = value;
        }
      } else {
        // Still include the column but with a clear empty indicator
        searchFields[requestedColName] = value || '';
      }
    });

    // Debug logging for first few rows in development
    if (index < 2) {
      console.log(`[DEBUG] Row ${index} search data:`, {
        originalRowKeys: Object.keys(row),
        originalRowValues: Object.values(row).map(v => String(v).substring(0, 50)),
        columnsToSearch,
        searchFields,
        hasData: Object.keys(searchFields).length > 0
      });
    }

    // Special debug for rows containing "Silicone"
    const rowText = Object.values(row).join(' ').toLowerCase();
    if (rowText.includes('silicone')) {
      console.log(`[DEBUG] FOUND SILICONE ROW at index ${index}:`, {
        originalRow: row,
        searchFields,
        columnsToSearch,
        columnMismatch: {
          availableColumns: Object.keys(row),
          requestedColumns: columnsToSearch,
          missingColumns: columnsToSearch.filter(col => !(col in row))
        }
      });
    }
    
    // Create return data (full row data for columns we want to return)
    const returnFields = {};
    columnsToReturn.forEach(requestedColName => {
      // Find the actual column name in the data
      const actualColName = this.findActualColumnName(requestedColName, availableColumns);
      returnFields[requestedColName] = row[actualColName];
    });

    return {
      index,
      searchData: searchFields,    // Data to analyze for semantic matching
      returnData: returnFields,    // Data to return in results
      fullData: row               // Keep full row for fallback
    };
  }

  /**
   * Make API call to OpenAI with retry logic
   */
  async callOpenAI(messages, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Newer models (GPT-4o, GPT-5, o1) have different parameter requirements
        const isNewerModel = this.model.includes('gpt-4o') || this.model.includes('gpt-5') || this.model.includes('o1');
        const requestBody = {
          model: this.model,
          messages: messages
        };
        
        // Use the correct parameters based on the model
        if (isNewerModel) {
          requestBody.max_completion_tokens = 2000;
          // Newer models only support default temperature (1), so don't set it
        } else {
          requestBody.max_tokens = 2000;
          requestBody.temperature = 0.1;
        }

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;
      } catch (error) {
        this.log('warning', `API call attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) throw error;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Process a single batch of rows for semantic matching
   */
  async processBatch(batchRows, query, batchIndex, schema, options = {}) {
    this.log('debug', `Processing batch ${batchIndex + 1} with ${batchRows.length} rows`);

    // Extract column configuration from options
    const { searchColumns, returnColumns } = options;

    // Prepare rows for analysis with column configuration
    const preparedRows = batchRows.map((row, localIndex) => 
      this.prepareRowForAnalysis(row, localIndex, schema, searchColumns, returnColumns)
    );

    // Check if this batch contains any silicone-related data
    const containsSilicone = batchRows.some(row => 
      Object.values(row).join(' ').toLowerCase().includes('silicone')
    );
    
    if (containsSilicone) {
      console.log(`[DEBUG] Batch ${batchIndex + 1} CONTAINS SILICONE DATA:`, {
        batchSize: batchRows.length,
        searchColumns: searchColumns,
        siliconeRows: batchRows.filter(row => 
          Object.values(row).join(' ').toLowerCase().includes('silicone')
        )
      });
    }

    this.log('debug', `Batch ${batchIndex + 1} prepared data sample:`, {
      batchSize: preparedRows.length,
      searchColumns: searchColumns || 'all columns',
      returnColumns: returnColumns || 'all columns',
      containsSilicone,
      sampleSearchData: preparedRows.slice(0, 2).map(row => row.searchData)
    });

    const prompt = `You are analyzing data to find records that semantically match a user's query.

USER QUERY: "${query}"

${searchColumns && searchColumns.length > 0 ? 
  `SEARCH FOCUS: Analyze only these columns for semantic matching: ${searchColumns.join(', ')}\n` : 
  'SEARCH FOCUS: Analyze all available columns for semantic matching\n'
}

AVAILABLE RECORDS (showing search fields only):
${preparedRows.map(row => `${row.index}: ${JSON.stringify(row.searchData)}`).join('\n')}

TASK: Find all records that match the user's query based on semantic meaning, context, and intent.

Consider:
- Synonyms and related terms
- Contextual meaning within the data domain
- Implied relationships between fields
- Common sense associations

RESPONSE FORMAT (JSON only):
{
  "matches": [
    {
      "index": 0,
      "confidence": 0.95,
      "reason": "Brief explanation of why this matches"
    }
  ],
  "reasoning": "Overall explanation of your matching strategy"
}

Confidence scale: 0.0 (no match) to 1.0 (perfect match). Only return matches with confidence >= 0.7.`;

    try {
      // Log the actual prompt for debugging (first batch only to avoid spam)
      if (batchIndex === 0) {
        console.log('[DEBUG] Full prompt being sent to OpenAI:', prompt);
      }
      
      this.log('debug', `Batch ${batchIndex + 1} - Sending to OpenAI:`, {
        promptLength: prompt.length,
        queryLength: query.length,
        recordCount: preparedRows.length
      });

      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a semantic data analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      this.log('debug', `Batch ${batchIndex + 1} - OpenAI response:`, {
        responseLength: response.length,
        responsePreview: response.substring(0, 200)
      });

      // Parse the JSON response
      const result = JSON.parse(response);
      
      // Map local indices back to global indices and add configured return data
      const globalMatches = result.matches.map(match => {
        const preparedRow = preparedRows[match.index];
        const baseResult = {
          _batchIndex: batchIndex,
          _localIndex: match.index,
          _globalIndex: (batchIndex * batchRows.length) + match.index,
          _confidence: match.confidence,
          _matchReason: match.reason
        };
        
        // Use returnData if configured, otherwise use full row
        const dataToReturn = preparedRow.returnData && Object.keys(preparedRow.returnData).length > 0 
          ? preparedRow.returnData 
          : batchRows[match.index];
          
        return {
          ...dataToReturn,
          ...baseResult
        };
      });

      this.log('success', `Batch ${batchIndex + 1} complete: ${globalMatches.length} matches found`);
      
      // Additional debugging for match results
      if (globalMatches.length > 0) {
        this.log('debug', `Batch ${batchIndex + 1} matches:`, {
          matchCount: globalMatches.length,
          confidences: globalMatches.map(m => m._confidence),
          reasons: globalMatches.map(m => m._matchReason?.substring(0, 50))
        });
      } else {
        this.log('debug', `Batch ${batchIndex + 1} - No matches found. Raw result:`, {
          rawMatches: result.matches?.length || 0,
          reasoning: result.reasoning
        });
      }
      
      return {
        matches: globalMatches,
        reasoning: result.reasoning,
        batchIndex
      };

    } catch (error) {
      this.log('error', `Failed to process batch ${batchIndex + 1}: ${error.message}`);
      return {
        matches: [],
        reasoning: `Batch processing failed: ${error.message}`,
        batchIndex,
        error: error.message
      };
    }
  }

  /**
   * Main semantic search function
   */
  async semanticSearch(query, allRows, schema, options = {}) {
    const {
      maxRows = 2000,
      minConfidence = 0.7,
      maxConcurrentBatches = 5,
      onBatchComplete = null,  // Callback for when each batch completes
      onProgressUpdate = null, // Callback for progress updates
      searchColumns = null,    // Columns to search within
      returnColumns = null     // Columns to return in results
    } = options;

    this.log('info', `🔍 Starting semantic batch search for: "${query}"`);
    this.log('info', `📊 Processing ${Math.min(allRows.length, maxRows)} rows`);

    // Limit the data size for performance
    const rowsToProcess = allRows.slice(0, maxRows);
    
    // Calculate optimal batch size
    const batchSize = this.calculateOptimalBatchSize(rowsToProcess.length);
    this.log('debug', `Calculated batch size: ${batchSize}`);

    // Create batches
    const batches = this.chunkArray(rowsToProcess, batchSize);
    this.log('info', `📦 Created ${batches.length} batches for parallel processing`);

    // Process batches with concurrency limit
    const allResults = [];
    let completedBatches = 0;
    
    // Initialize progress
    if (onProgressUpdate) {
      onProgressUpdate({
        totalBatches: batches.length,
        completedBatches: 0,
        totalMatches: 0,
        averageConfidence: 0
      });
    }
    
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + maxConcurrentBatches);
      this.log('info', `🚀 Processing batch group ${Math.floor(i / maxConcurrentBatches) + 1}/${Math.ceil(batches.length / maxConcurrentBatches)}`);
      
      const groupPromises = batchGroup.map(async (batch, groupIndex) => {
        const batchIndex = i + groupIndex;
        const batchOptions = { searchColumns, returnColumns };
        const result = await this.processBatch(batch, query, batchIndex, schema, batchOptions);
        
        // Call batch complete callback immediately when this batch finishes
        if (onBatchComplete && result.matches.length > 0) {
          onBatchComplete({
            batchIndex,
            matches: result.matches.filter(match => match._confidence >= minConfidence),
            batchProgress: {
              completed: completedBatches + groupIndex + 1,
              total: batches.length
            }
          });
        }
        
        return result;
      });

      const groupResults = await Promise.all(groupPromises);
      allResults.push(...groupResults);
      completedBatches += batchGroup.length;
      
      // Update progress after each batch group
      if (onProgressUpdate) {
        const currentMatches = allResults
          .flatMap(result => result.matches)
          .filter(match => match._confidence >= minConfidence);
          
        const avgConfidence = currentMatches.length > 0 
          ? currentMatches.reduce((sum, match) => sum + match._confidence, 0) / currentMatches.length 
          : 0;
          
        onProgressUpdate({
          totalBatches: batches.length,
          completedBatches,
          totalMatches: currentMatches.length,
          averageConfidence: avgConfidence
        });
      }

      // Small delay between batch groups to be respectful to API limits
      if (i + maxConcurrentBatches < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Collect all matches
    const allMatches = allResults
      .flatMap(result => result.matches)
      .filter(match => match._confidence >= minConfidence)
      .sort((a, b) => b._confidence - a._confidence);

    // Calculate statistics
    const totalProcessed = rowsToProcess.length;
    const totalMatches = allMatches.length;
    const averageConfidence = allMatches.length > 0 
      ? allMatches.reduce((sum, match) => sum + match._confidence, 0) / allMatches.length 
      : 0;

    const results = {
      method: 'semantic_batch_search',
      query,
      matches: allMatches,
      statistics: {
        totalRowsProcessed: totalProcessed,
        totalMatches,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        batchCount: batches.length,
        batchSize,
        processingTime: Date.now()
      },
      summary: {
        totalResults: totalMatches,
        highConfidenceMatches: allMatches.filter(m => m._confidence >= 0.9).length,
        mediumConfidenceMatches: allMatches.filter(m => m._confidence >= 0.8 && m._confidence < 0.9).length,
        processingStrategy: 'Semantic understanding via parallel batch processing'
      }
    };

    this.log('success', `✅ Semantic search complete: ${totalMatches} matches from ${totalProcessed} rows`);
    this.log('info', `📈 Average confidence: ${averageConfidence.toFixed(2)}, ${results.summary.highConfidenceMatches} high-confidence matches`);

    return results;
  }

  /**
   * Enhanced semantic search with category analysis
   */
  async enhancedSemanticSearch(query, allRows, schema, options = {}) {
    // First, run regular semantic search (callbacks are passed through)
    const baseResults = await this.semanticSearch(query, allRows, schema, options);

    // If we have good matches, also analyze categories/patterns
    if (baseResults.matches.length > 0) {
      this.log('info', '🔍 Running enhanced pattern analysis...');
      
      try {
        const categoryPrompt = `Based on these semantic matches for "${query}":

${baseResults.matches.slice(0, 10).map((match, i) => 
  `${i + 1}. ${JSON.stringify(match)} (confidence: ${match._confidence})`
).join('\n')}

Identify:
1. Common patterns or categories in the matches
2. Key characteristics that define a match
3. Suggested refinements to improve future searches

Respond with JSON:
{
  "patterns": ["pattern1", "pattern2"],
  "characteristics": ["key trait 1", "key trait 2"],
  "refinements": ["suggestion 1", "suggestion 2"]
}`;

        const enhancedResponse = await this.callOpenAI([
          { role: 'system', content: 'You are a data pattern analyst. Respond only with valid JSON.' },
          { role: 'user', content: categoryPrompt }
        ]);

        const enhancements = JSON.parse(enhancedResponse);
        
        return {
          ...baseResults,
          enhancements,
          method: 'enhanced_semantic_batch_search'
        };

      } catch (error) {
        this.log('warning', `Enhanced analysis failed: ${error.message}`);
        return baseResults;
      }
    }

    return baseResults;
  }
}