/**
 * Dynamic Category Manager
 * Intelligently manages category creation and reuse for large dataset tagging
 */

export class DynamicCategoryManager {
  constructor(apiKey, model = 'gpt-4o-mini-2024-07-18', logger = null) {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = logger || (() => {});
    this.dynamicCategories = new Map(); // category_name -> { count, examples, description }
    this.categoryAliases = new Map(); // alias -> canonical_category
    this.categoryCache = new Map(); // data_signature -> category
  }

  log(type, message, data = null) {
    if (typeof this.logger === 'function') {
      this.logger(type, message, data);
    }
  }

  /**
   * Main categorization method with intelligent reuse
   */
  async categorizeWithDynamicReuse(data, predefinedCategories = [], context = '', onCategoryUpdate = null, userPrompt = '') {
    this.log('info', `Starting dynamic categorization`, { 
      predefinedCount: predefinedCategories.length, 
      dynamicCount: this.dynamicCategories.size,
      dataItems: Array.isArray(data) ? data.length : 1,
      pureDynamicMode: predefinedCategories.length === 0
    });

    const dataArray = Array.isArray(data) ? data : [data];
    const results = [];

    // Initialize with predefined categories (if any)
    predefinedCategories.forEach(cat => {
      if (cat.trim() && !this.dynamicCategories.has(cat.trim())) {
        this.dynamicCategories.set(cat.trim(), {
          count: 0,
          examples: [],
          description: `Predefined category: ${cat.trim()}`,
          confidence: 1.0,
          isPredefined: true
        });
      }
    });

    for (const [index, item] of dataArray.entries()) {
      this.log('debug', `Processing item ${index + 1}/${dataArray.length}`);
      
      // Check cache first
      const signature = this.generateDataSignature(item);
      if (this.categoryCache.has(signature)) {
        const cachedCategory = this.categoryCache.get(signature);
        results.push(cachedCategory);
        this.updateCategoryUsage(cachedCategory.category, item);
        continue;
      }

      // Find best category (existing or create new)
      const categoryResult = await this.findOrCreateCategory(item, context, index + 1, userPrompt);
      results.push(categoryResult);
      
      // Cache the result
      this.categoryCache.set(signature, categoryResult);
      
      // Update category statistics
      this.updateCategoryUsage(categoryResult.category, item);
      
      // Real-time category update callback
      if (onCategoryUpdate && typeof onCategoryUpdate === 'function') {
        onCategoryUpdate({
          newCategory: categoryResult.isNew ? categoryResult.category : null,
          allCategories: Array.from(this.dynamicCategories.keys()),
          currentStats: this.getCategoryStatistics()
        });
      }
    }

    this.log('success', `Dynamic categorization complete`, {
      totalItems: dataArray.length,
      uniqueCategories: this.dynamicCategories.size,
      newCategories: Array.from(this.dynamicCategories.entries())
        .filter(([_, data]) => !data.isPredefined).length
    });

    return {
      results,
      categoryStats: this.getCategoryStatistics(),
      dynamicCategories: Array.from(this.dynamicCategories.keys())
    };
  }

  /**
   * Simplified approach: tag each row then check for matches
   */
  async findOrCreateCategory(item, context, itemNumber, userPrompt = '') {
    const existingCategories = Array.from(this.dynamicCategories.keys());
    
    if (existingCategories.length === 0) {
      // No existing categories, create first one
      this.log('debug', `Creating first category for item ${itemNumber}`);
      return await this.tagItemAndCreateCategory(item, userPrompt);
    }

    // Tag the item first, then check if it matches existing categories
    this.log('debug', `Tagging item ${itemNumber} and checking against ${existingCategories.length} existing categories`);
    return await this.tagAndMatchOrCreate(item, existingCategories, userPrompt);
  }

  /**
   * Tag an item and create the first category
   */
  async tagItemAndCreateCategory(item, userPrompt = '') {
    const prompt = `Tag this data item with a category name following the user's format:

Data Item: "${typeof item === 'object' ? JSON.stringify(item) : item}"
${userPrompt ? 'User Format: "' + userPrompt + '"' : ''}

${userPrompt ? 'CRITICAL: Follow the user format EXACTLY. If they want "2 word category", give exactly 2 words.' : ''}

Respond with just the category name, nothing else.`;

    try {
      const response = await this.callOpenAI(prompt, 0.3);
      const categoryName = response.content.trim().replace(/['"]/g, '');
      
      // Add the new category to our list
      this.dynamicCategories.set(categoryName, {
        count: 0,
        examples: [],
        description: `AI-generated category for: ${typeof item === 'object' ? JSON.stringify(item).substring(0, 100) : String(item).substring(0, 100)}`,
        confidence: 0.9,
        isPredefined: false,
        createdAt: new Date().toISOString()
      });

      this.log('success', `Created first category: "${categoryName}"`);

      return {
        category: categoryName,
        confidence: 0.9,
        reasoning: 'First category created',
        isNew: true
      };
    } catch (error) {
      this.log('error', `Failed to tag item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tag item and match against existing categories or create new one
   */
  async tagAndMatchOrCreate(item, existingCategories, userPrompt = '') {
    const prompt = `Tag this data item with a category name. First check if it matches any existing categories, if not create a new one.

Data Item: "${typeof item === 'object' ? JSON.stringify(item) : item}"
${userPrompt ? 'User Format: "' + userPrompt + '"' : ''}

EXISTING CATEGORIES (check these first):
${existingCategories.map((cat, i) => `${i + 1}. "${cat}"`).join('\n')}

INSTRUCTIONS:
1. First check if this item fits ANY of the existing categories above
2. If it matches (even roughly), use the EXACT existing category name
3. Only create a new category if it's completely different
4. ${userPrompt ? 'Follow the user format EXACTLY: ' + userPrompt : 'Use a clear, concise category name'}

Respond with JSON:
{
  "category": "exact_category_name",
  "isExisting": true/false,
  "reasoning": "why this category was chosen"
}`;

    try {
      const response = await this.callOpenAI(prompt, 0.3);
      const result = this.parseJSONResponse(response.content);
      
      if (result.isExisting) {
        this.log('debug', `Matched existing category: "${result.category}"`);
        return {
          category: result.category,
          confidence: 0.85,
          reasoning: result.reasoning,
          isNew: false
        };
      } else {
        // Create new category
        this.dynamicCategories.set(result.category, {
          count: 0,
          examples: [],
          description: `AI-generated category for: ${typeof item === 'object' ? JSON.stringify(item).substring(0, 100) : String(item).substring(0, 100)}`,
          confidence: 0.8,
          isPredefined: false,
          createdAt: new Date().toISOString()
        });

        this.log('success', `Created new category: "${result.category}"`);
        
        return {
          category: result.category,
          confidence: 0.8,
          reasoning: result.reasoning,
          isNew: true
        };
      }
    } catch (error) {
      this.log('error', `Failed to tag and match item: ${error.message}`);
      
      // Fallback: create a simple category
      const fallbackName = `Category_${this.dynamicCategories.size + 1}`;
      this.dynamicCategories.set(fallbackName, {
        count: 0,
        examples: [],
        description: `Fallback category for: ${String(item).substring(0, 50)}...`,
        confidence: 0.5,
        isPredefined: false,
        createdAt: new Date().toISOString()
      });

      return {
        category: fallbackName,
        confidence: 0.5,
        reasoning: 'Fallback due to processing error',
        isNew: true
      };
    }
  }

  /**
   * Pre-check for obvious similar categories using enhanced similarity detection
   */
  checkSimilarCategories(newCategoryName, existingCategories) {
    const newCategoryNorm = newCategoryName.toLowerCase().trim();
    const newWords = newCategoryNorm.split(/\s+/).filter(word => word.length > 2);
    
    const synonymGroups = [
      ['hardware', 'components', 'parts', 'pieces', 'elements', 'component'],
      ['equipment', 'tools', 'instruments', 'devices', 'apparatus'],
      ['fastener', 'fasteners', 'connector', 'connectors', 'fastening'],
      ['material', 'materials', 'substance', 'substances', 'matter'],
      ['medical', 'healthcare', 'health', 'clinical', 'therapeutic'],
      ['dental', 'tooth', 'teeth', 'oral', 'orthodontic'],
      ['plate', 'plates', 'panel', 'panels', 'board', 'boards']
    ];

    for (const existingCategory of existingCategories) {
      const existingNorm = existingCategory.toLowerCase().trim();
      const existingWords = existingNorm.split(/\s+/).filter(word => word.length > 2);
      
      // Exact match (case insensitive)
      if (newCategoryNorm === existingNorm) {
        return { similar: true, category: existingCategory, reason: 'Exact match (case insensitive)' };
      }
      
      // Check for substantial word overlap (>= 50% of words match)
      const commonWords = newWords.filter(word => existingWords.includes(word));
      if (commonWords.length > 0 && commonWords.length / Math.max(newWords.length, existingWords.length) >= 0.5) {
        return { similar: true, category: existingCategory, reason: `High word overlap: ${commonWords.join(', ')}` };
      }
      
      // Check for synonym overlap - if ANY word from new category has synonym in existing
      for (const synonymGroup of synonymGroups) {
        const newSynonyms = newWords.filter(word => synonymGroup.includes(word));
        const existingSynonyms = existingWords.filter(word => synonymGroup.includes(word));
        if (newSynonyms.length > 0 && existingSynonyms.length > 0) {
          return { similar: true, category: existingCategory, reason: `Synonym overlap: "${newSynonyms.join(', ')}" ≈ "${existingSynonyms.join(', ')}"` };
        }
      }
      
      // Check for partial substring matches (avoid things like "Fast" matching "Fastener")
      if (newWords.length === 1 && existingWords.length === 1) {
        const newWord = newWords[0];
        const existingWord = existingWords[0];
        if ((newWord.includes(existingWord) && existingWord.length > 4) || 
            (existingWord.includes(newWord) && newWord.length > 4)) {
          return { similar: true, category: existingCategory, reason: `Substring match: "${newWord}" ↔ "${existingWord}"` };
        }
      }
    }
    
    return { similar: false };
  }

  /**
   * Find best match among existing categories
   */
  async findBestExistingMatch(item, existingCategories, context) {
    const prompt = `Analyze this data item and determine if it fits any existing categories:

Data Item: "${typeof item === 'object' ? JSON.stringify(item) : item}"
Context: ${context}

Existing Categories:
${existingCategories.map((cat, i) => {
  const catData = this.dynamicCategories.get(cat);
  return `${i + 1}. "${cat}" - ${catData.description} (used ${catData.count} times)
     Examples: ${catData.examples.slice(0, 3).join(', ')}`;
}).join('\n')}

Task: Determine if this item should use an existing category or if a new category should be created.

CRITICAL: Be EXTREMELY strict about avoiding similar/duplicate categories. These are all the SAME category:
- "Fastener Hardware" = "Fastener Components" = "Fastener Parts" = "Fasteners"
- "Medical Supplies" = "Medical Equipment" = "Healthcare Supplies"  
- "Dental Material" = "Dental Supplies" = "Dental Equipment"

Consider:
- SEMANTIC SIMILARITY (treat synonyms as identical - "Hardware" = "Components" = "Parts" = "Elements")  
- WORD OVERLAP (if >50% of words overlap, it's the SAME category)
- Business logic and domain fit  
- Category purpose and scope
- Existing usage patterns
- SUBSTRING MATCHES (if one category name contains most of another, they're the same)

EXAMPLES of what should use EXISTING categories:
- If "Fastener Hardware" exists, "Fastener Components" should use it
- If "Medical Supplies" exists, "Medical Equipment" should use it
- If "Large Plate" exists, "Big Plate" should use it

Respond with JSON:
{
  "shouldUseExisting": true/false,
  "category": "exact_category_name_if_using_existing",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of decision",
  "alternatives": [
    {
      "category": "alternative_category",
      "confidence": 0.0-1.0,
      "reasoning": "why this could also work"
    }
  ],
  "newCategoryNeeded": {
    "suggestedName": "suggested_new_category_name",
    "reasoning": "why new category is needed"
  }
}

Guidelines:
- Use confidence > 0.5 for shouldUseExisting: true (VERY LOW threshold to maximize reuse)
- EXTREMELY STRONGLY prefer reusing existing categories over creating similar ones
- Consider these as SAME categories: "Hardware/Components/Parts", "Equipment/Tools/Instruments", "Fastener/Fasteners/Connectors"
- Only create new categories when the concept is COMPLETELY different (90%+ semantic difference)
- When in doubt, ALWAYS REUSE the existing category rather than create a similar one
- Treat "Fastener Hardware" and "Fastener Components" as the EXACT SAME category`;

    try {
      const response = await this.callOpenAI(prompt, 0.3);
      const analysis = this.parseJSONResponse(response.content);
      
      this.log('debug', `Category matching analysis complete`, {
        shouldUseExisting: analysis.shouldUseExisting,
        confidence: analysis.confidence,
        suggestedCategory: analysis.category
      });

      return analysis;
    } catch (error) {
      this.log('error', `Category matching failed: ${error.message}`);
      // Fallback: don't use existing categories if analysis fails
      return {
        shouldUseExisting: false,
        confidence: 0,
        reasoning: 'Analysis failed, creating new category',
        newCategoryNeeded: { suggestedName: 'Uncategorized', reasoning: 'Fallback category' }
      };
    }
  }

  /**
   * Create new category with AI assistance
   */
  async createNewCategory(item, context, itemNumber, alternatives = [], userPrompt = '') {
    const existingCategoryNames = Array.from(this.dynamicCategories.keys());
    
    // Pre-check: Let's see what category the AI would suggest first
    const quickPrompt = `Based on this data item, suggest a category name following the user's format:

Data Item: "${typeof item === 'object' ? JSON.stringify(item) : item}"
${userPrompt ? 'USER FORMAT: "' + userPrompt + '"' : ''}

Respond with just the category name, nothing else.`;

    try {
      const quickResponse = await this.callOpenAI(quickPrompt, 0.3);
      const suggestedCategory = quickResponse.content.trim().replace(/['"]/g, '');
      
      // Check if this suggested category is similar to existing ones
      const similarityCheck = this.checkSimilarCategories(suggestedCategory, existingCategoryNames);
      if (similarityCheck.similar) {
        this.log('info', `Suggested category "${suggestedCategory}" is similar to existing "${similarityCheck.category}". Using existing category.`);
        return {
          category: similarityCheck.category,
          description: `Reused existing category instead of creating similar "${suggestedCategory}"`,
          confidence: 0.85,
          reasoning: `Prevented duplicate: ${similarityCheck.reason}`,
          expectedUsage: 'Same as existing category',
          isNew: false
        };
      }
    } catch (error) {
      this.log('warning', 'Pre-check failed, proceeding with full category creation');
    }

    const prompt = `Create a new category for this data item following the user's specific instructions:

Data Item: "${typeof item === 'object' ? JSON.stringify(item) : item}"
Context: ${context}
Item Number: ${itemNumber}

${userPrompt ? 'USER INSTRUCTIONS: "' + userPrompt + '"\nCRITICAL: Follow the user\'s instructions EXACTLY. If they want "2 word category", give exactly 2 words. If they want "category name only", give ONLY the category name with no explanations.' : ''}

${existingCategoryNames.length > 0 ? 'EXISTING CATEGORIES - DO NOT CREATE SIMILAR ONES:\n' + existingCategoryNames.map((cat, i) => `${i + 1}. "${cat}"`).join('\n') + '\nCRITICAL: If your suggested category is similar to ANY of the above, DO NOT create it. These cover similar concepts.' : 'This is the first category being created.'}

${alternatives.length > 0 ? 'Alternative categories considered:\n' + alternatives.map(alt => `- "${alt.category}" (${alt.reasoning})`).join('\n') : ''}

Create a new category that:
- FOLLOWS THE USER INSTRUCTIONS EXACTLY
- Doesn't duplicate existing categories  
- Could be reused for similar items

Respond with JSON:
{
  "categoryName": "category_name_following_user_format",
  "description": "brief description of what this category represents",
  "confidence": 0.0-1.0,
  "reasoning": "why this category name was chosen",
  "expectedUsage": "types of items that would fit this category"
}

CRITICAL GUIDELINES:
- If user wants "2 word category", categoryName must be EXACTLY 2 words
- If user wants "category name only", provide just the category name in categoryName field
- Follow the user's format requirements precisely
- The categoryName field should match the user's requested format exactly`;

    try {
      const response = await this.callOpenAI(prompt, 0.4);
      const newCategoryData = this.parseJSONResponse(response.content);
      
      // Add the new category to our dynamic list
      this.dynamicCategories.set(newCategoryData.categoryName, {
        count: 0,
        examples: [],
        description: newCategoryData.description,
        confidence: newCategoryData.confidence,
        reasoning: newCategoryData.reasoning,
        expectedUsage: newCategoryData.expectedUsage,
        businessValue: newCategoryData.businessValue,
        isPredefined: false,
        createdAt: new Date().toISOString(),
        createdFrom: typeof item === 'object' ? JSON.stringify(item) : String(item)
      });

      this.log('success', `Created new category: "${newCategoryData.categoryName}"`, {
        description: newCategoryData.description,
        confidence: newCategoryData.confidence
      });

      return {
        category: newCategoryData.categoryName,
        confidence: newCategoryData.confidence,
        reasoning: newCategoryData.reasoning,
        isNew: true,
        businessValue: newCategoryData.businessValue,
        expectedUsage: newCategoryData.expectedUsage
      };

    } catch (error) {
      this.log('error', `New category creation failed: ${error.message}`);
      
      // Fallback: create a basic category
      const fallbackName = `Category_${this.dynamicCategories.size + 1}`;
      this.dynamicCategories.set(fallbackName, {
        count: 0,
        examples: [],
        description: `Auto-generated category for item: ${String(item).substring(0, 50)}...`,
        confidence: 0.5,
        isPredefined: false,
        createdAt: new Date().toISOString()
      });

      return {
        category: fallbackName,
        confidence: 0.5,
        reasoning: 'Fallback category due to analysis failure',
        isNew: true
      };
    }
  }

  /**
   * Update category usage statistics
   */
  updateCategoryUsage(categoryName, item) {
    if (this.dynamicCategories.has(categoryName)) {
      const categoryData = this.dynamicCategories.get(categoryName);
      categoryData.count += 1;
      
      // Store examples (limit to 10)
      const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item);
      if (categoryData.examples.length < 10 && !categoryData.examples.includes(itemStr)) {
        categoryData.examples.push(itemStr);
      }
      
      this.dynamicCategories.set(categoryName, categoryData);
    }
  }

  /**
   * Get category statistics and insights
   */
  getCategoryStatistics() {
    const categories = Array.from(this.dynamicCategories.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        description: data.description,
        examples: data.examples.slice(0, 3),
        isPredefined: data.isPredefined || false,
        confidence: data.confidence || 0,
        businessValue: data.businessValue || '',
        createdAt: data.createdAt || null
      }))
      .sort((a, b) => b.count - a.count);

    const totalItems = categories.reduce((sum, cat) => sum + cat.count, 0);
    const newCategories = categories.filter(cat => !cat.isPredefined).length;
    const predefinedCategories = categories.filter(cat => cat.isPredefined).length;

    return {
      totalCategories: categories.length,
      totalItems,
      newCategories,
      predefinedCategories,
      categories,
      categoryDistribution: categories.map(cat => ({
        name: cat.name,
        percentage: totalItems > 0 ? ((cat.count / totalItems) * 100).toFixed(1) : 0,
        count: cat.count
      }))
    };
  }

  /**
   * Export categories for reuse
   */
  exportCategories() {
    return {
      timestamp: new Date().toISOString(),
      dynamicCategories: Object.fromEntries(this.dynamicCategories),
      categoryAliases: Object.fromEntries(this.categoryAliases),
      stats: this.getCategoryStatistics()
    };
  }

  /**
   * Import categories from previous session
   */
  importCategories(exportedData) {
    if (exportedData.dynamicCategories) {
      this.dynamicCategories = new Map(Object.entries(exportedData.dynamicCategories));
    }
    if (exportedData.categoryAliases) {
      this.categoryAliases = new Map(Object.entries(exportedData.categoryAliases));
    }
    
    this.log('info', `Imported categories`, {
      categoriesImported: this.dynamicCategories.size,
      aliasesImported: this.categoryAliases.size
    });
  }

  /**
   * Clear all dynamic data
   */
  reset() {
    this.dynamicCategories.clear();
    this.categoryAliases.clear();
    this.categoryCache.clear();
    this.log('info', 'Dynamic category manager reset');
  }

  /**
   * Generate data signature for caching
   */
  generateDataSignature(item) {
    const str = typeof item === 'object' ? JSON.stringify(item) : String(item);
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Utility: Call OpenAI API
   */
  async callOpenAI(prompt, temperature = 0.3) {
    const isGPT5Model = this.model.toLowerCase().includes('gpt-5') || this.model.toLowerCase().includes('o4-mini');
    const finalTemperature = isGPT5Model ? 1 : temperature;
    
    this.log('debug', `Dynamic category AI call with temperature: ${finalTemperature}`);
    
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
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content?.trim() || '',
      usage: data.usage
    };
  }

  /**
   * Utility: Parse JSON response with error handling
   */
  parseJSONResponse(content) {
    if (!content) throw new Error('Empty response');
    
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
    
    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('JSON parsing failed for content:', cleanContent);
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }
}

export default DynamicCategoryManager;