/**
 * Dynamic AI-Powered Pattern Detection Service
 * Replaces static regex with intelligent AI pattern recognition
 */

export class DynamicPatternDetection {
  constructor(apiKey, model = 'gpt-4o-mini-2024-07-18', logger = null) {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = logger || (() => {});
    this.patternCache = new Map();
  }

  log(type, message, data = null) {
    if (typeof this.logger === 'function') {
      this.logger(type, message, data);
    }
  }

  /**
   * Dynamically analyze data patterns using AI
   */
  async analyzeDataPatterns(sampleData, columnName, userContext = '') {
    this.log('debug', `🔍 Analyzing patterns for column: ${columnName}`, { sampleCount: sampleData.length, userContext });
    
    const cacheKey = `${columnName}-${JSON.stringify(sampleData.slice(0, 5))}`;
    
    if (this.patternCache.has(cacheKey)) {
      this.log('info', `📋 Using cached pattern analysis for column: ${columnName}`);
      return this.patternCache.get(cacheKey);
    }

    const prompt = `Analyze these data samples from column "${columnName}" and identify patterns:

Sample data:
${sampleData.slice(0, 20).map((val, i) => `${i + 1}. "${val}"`).join('\n')}

User context: ${userContext}

Please identify patterns and provide analysis in JSON:
{
  "dataType": "primary data type (email, phone, name, address, currency, date, text, number, etc.)",
  "patterns": [
    {
      "type": "pattern_name",
      "description": "what this pattern represents",
      "examples": ["example1", "example2"],
      "confidence": 0.95,
      "matchingRule": "how to identify this pattern"
    }
  ],
  "insights": {
    "format": "common format observed",
    "language": "detected language if text",
    "region": "geographic region if applicable",
    "domain": "business domain if applicable",
    "quality": "data quality assessment"
  },
  "suggestions": {
    "cleaningNeeded": true/false,
    "standardization": "how to standardize if needed",
    "validation": "validation rules to apply"
  }
}

Be creative and intelligent - look for business patterns, regional patterns, format patterns, semantic patterns, etc.`;

    try {
      this.log('debug', `🤖 Sending pattern analysis prompt for ${columnName} to AI`, { promptLength: prompt.length });
      const response = await this.callOpenAI(prompt, 0.3);
      this.log('debug', `📝 Pattern analysis response received for ${columnName}`, { responseLength: response.content?.length });
      
      const analysis = this.parseJSONResponse(response.content);
      this.log('success', `✅ Pattern analysis complete for ${columnName}`, { 
        dataType: analysis.dataType, 
        patternCount: analysis.patterns?.length || 0 
      });
      
      this.patternCache.set(cacheKey, analysis);
      return analysis;
      
    } catch (error) {
      this.log('error', `❌ Pattern analysis failed for ${columnName}: ${error.message}`, { error });
      console.error('Pattern analysis failed:', error);
      return this.fallbackPatternAnalysis(sampleData, columnName);
    }
  }

  /**
   * Dynamic content matching - much more intelligent than regex
   */
  async matchesPattern(value, patternDescription, context = '') {
    const prompt = `Does this value match the pattern description?

Value: "${value}"
Pattern: "${patternDescription}"
Context: ${context}

Respond with JSON:
{
  "matches": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "extractedInfo": "any structured info if applicable"
}

Examples:
- Value: "jean.doe@company.fr" Pattern: "French email addresses" → matches: true
- Value: "Happy customer!" Pattern: "positive sentiment" → matches: true
- Value: "Project-2024-Q1" Pattern: "project codes" → matches: true`;

    try {
      const response = await this.callOpenAI(prompt, 0.1);
      return this.parseJSONResponse(response.content);
    } catch (error) {
      return { matches: false, confidence: 0, reasoning: 'Analysis failed' };
    }
  }

  /**
   * Smart data classification - understands context and meaning
   */
  async classifyData(values, userQuestion, context = '') {
    const sampleValues = values.slice(0, 10);
    
    const prompt = `Classify these data values based on the user's question:

Question: "${userQuestion}"
Context: ${context}

Values to classify:
${sampleValues.map((val, i) => `${i + 1}. "${val}"`).join('\n')}

For each value, determine if it matches what the user is looking for.
Consider:
- Semantic meaning (not just literal matching)
- Business context
- Intent behind the question
- Cultural/regional context

Respond with JSON:
{
  "classifications": [
    {
      "value": "original value",
      "matches": true/false,
      "confidence": 0.0-1.0,
      "category": "assigned category",
      "reasoning": "why it matches/doesn't match",
      "metadata": {
        "language": "detected language",
        "sentiment": "positive/negative/neutral",
        "businessContext": "relevant business meaning",
        "extractedEntities": ["entity1", "entity2"]
      }
    }
  ],
  "overallInsights": {
    "dominantPattern": "most common pattern",
    "recommendations": "suggestions for further analysis"
  }
}`;

    try {
      const response = await this.callOpenAI(prompt, 0.2);
      return this.parseJSONResponse(response.content);
    } catch (error) {
      console.error('Classification failed:', error);
      return { classifications: [], overallInsights: {} };
    }
  }

  /**
   * Contextual similarity matching - understands related concepts
   */
  async findSimilarContent(targetValue, allValues, threshold = 0.7) {
    const sampleValues = allValues.slice(0, 50); // Limit for API efficiency
    
    const prompt = `Find values similar to the target value:

Target: "${targetValue}"

Values to compare:
${sampleValues.map((val, i) => `${i + 1}. "${val}"`).join('\n')}

Find values that are:
- Semantically similar
- Contextually related
- Same category/type
- Similar format or pattern

Respond with JSON:
{
  "similarValues": [
    {
      "value": "similar value",
      "similarity": 0.0-1.0,
      "reasoning": "why they're similar",
      "type": "similarity type (semantic, format, context, etc.)"
    }
  ],
  "clusters": [
    {
      "theme": "common theme",
      "values": ["val1", "val2", "val3"],
      "description": "what makes them similar"
    }
  ]
}`;

    try {
      const response = await this.callOpenAI(prompt, 0.2);
      const result = this.parseJSONResponse(response.content);
      
      // Filter by threshold
      result.similarValues = result.similarValues?.filter(item => 
        item.similarity >= threshold
      ) || [];
      
      return result;
    } catch (error) {
      console.error('Similarity analysis failed:', error);
      return { similarValues: [], clusters: [] };
    }
  }

  /**
   * Smart data validation - context-aware validation
   */
  async validateData(values, expectedPattern, businessContext = '') {
    const sampleValues = values.slice(0, 20);
    
    const prompt = `Validate these data values against the expected pattern:

Expected Pattern: "${expectedPattern}"
Business Context: ${businessContext}

Values to validate:
${sampleValues.map((val, i) => `${i + 1}. "${val}"`).join('\n')}

Check for:
- Format compliance
- Business logic compliance
- Data quality issues
- Inconsistencies
- Missing information

Respond with JSON:
{
  "validationResults": [
    {
      "value": "original value",
      "isValid": true/false,
      "issues": ["issue1", "issue2"],
      "suggestions": "how to fix",
      "confidence": 0.0-1.0
    }
  ],
  "overallQuality": {
    "score": 0.0-1.0,
    "mainIssues": ["issue1", "issue2"],
    "recommendations": "overall recommendations"
  }
}`;

    try {
      const response = await this.callOpenAI(prompt, 0.1);
      return this.parseJSONResponse(response.content);
    } catch (error) {
      console.error('Validation failed:', error);
      return { validationResults: [], overallQuality: { score: 0, mainIssues: [], recommendations: '' } };
    }
  }

  /**
   * Extract business insights from patterns
   */
  async extractBusinessInsights(patterns, dataContext, userGoals = '') {
    const prompt = `Analyze these data patterns and extract business insights:

Data Context: ${dataContext}
User Goals: ${userGoals}

Patterns Found:
${JSON.stringify(patterns, null, 2)}

Provide business insights in JSON:
{
  "businessInsights": [
    {
      "insight": "specific business insight",
      "impact": "potential business impact",
      "actionable": "specific actions to take",
      "confidence": 0.0-1.0
    }
  ],
  "opportunities": [
    {
      "opportunity": "business opportunity",
      "description": "detailed description",
      "requirements": "what's needed to pursue this"
    }
  ],
  "risks": [
    {
      "risk": "potential risk",
      "severity": "high/medium/low",
      "mitigation": "how to mitigate"
    }
  ],
  "recommendations": {
    "immediate": "immediate actions",
    "shortTerm": "short-term improvements",
    "longTerm": "long-term strategy"
  }
}`;

    try {
      const response = await this.callOpenAI(prompt, 0.3);
      return this.parseJSONResponse(response.content);
    } catch (error) {
      console.error('Business insights extraction failed:', error);
      return { businessInsights: [], opportunities: [], risks: [], recommendations: {} };
    }
  }

  /**
   * Fallback pattern analysis using basic heuristics
   */
  fallbackPatternAnalysis(sampleData, columnName) {
    const patterns = [];
    const sample = sampleData.slice(0, 10);
    
    // Basic heuristics
    if (sample.some(val => String(val).includes('@'))) {
      patterns.push({ type: 'email', confidence: 0.8, description: 'Email addresses detected' });
    }
    
    if (sample.some(val => !isNaN(val) && !isNaN(parseFloat(val)))) {
      patterns.push({ type: 'numeric', confidence: 0.9, description: 'Numeric values detected' });
    }
    
    if (sample.some(val => String(val).length > 50)) {
      patterns.push({ type: 'text', confidence: 0.7, description: 'Long text content detected' });
    }
    
    return {
      dataType: patterns.length > 0 ? patterns[0].type : 'text',
      patterns: patterns,
      insights: { format: 'mixed', quality: 'unknown' },
      suggestions: { cleaningNeeded: false, standardization: 'none' }
    };
  }

  /**
   * Utility: Call OpenAI API
   */
  async callOpenAI(prompt, temperature = 0.2) {
    // GPT-5 models only support default temperature (1)
    const isGPT5Model = this.model.toLowerCase().includes('gpt-5') || this.model.toLowerCase().includes('o4-mini');
    const finalTemperature = isGPT5Model ? 1 : temperature;
    
    this.log('debug', `🌡️ Pattern detection using temperature: ${finalTemperature} (GPT-5 model: ${isGPT5Model})`);
    
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
   * Utility: Parse JSON response with markdown handling
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
    
    // Handle array responses
    if (!cleanContent.startsWith('{') && cleanContent.includes('[')) {
      const arrayStartIndex = cleanContent.indexOf('[');
      const arrayEndIndex = cleanContent.lastIndexOf(']');
      if (arrayStartIndex !== -1 && arrayEndIndex !== -1) {
        cleanContent = cleanContent.substring(arrayStartIndex, arrayEndIndex + 1);
      }
    }
    
    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('JSON parsing failed for content:', cleanContent);
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.patternCache.clear();
  }
}

/**
 * Example usage patterns for different scenarios
 */
export const PatternExamples = {
  // Dynamic content detection
  FRENCH_CONTENT: {
    description: "French language content",
    context: "Looking for French titles, descriptions, or any French text",
    examples: ["Compétences-Leadership", "Éducation", "français", "québécois"]
  },
  
  CUSTOMER_SEGMENTS: {
    description: "Customer segment indicators",
    context: "Enterprise, SMB, consumer, premium, basic tier customers",
    examples: ["Enterprise", "Premium", "VIP", "Basic", "Professional"]
  },
  
  PROJECT_STATUSES: {
    description: "Project or task status indicators", 
    context: "Active, completed, pending, cancelled, on-hold projects",
    examples: ["Active", "Completed", "In Progress", "Cancelled", "On Hold"]
  },
  
  SENTIMENT_INDICATORS: {
    description: "Positive or negative sentiment",
    context: "Customer feedback, reviews, satisfaction indicators",
    examples: ["Excellent", "Poor", "Satisfied", "Disappointed", "Happy"]
  },
  
  GEOGRAPHIC_REGIONS: {
    description: "Geographic locations or regions",
    context: "Countries, states, cities, regions mentioned in data",
    examples: ["North America", "Europe", "Asia-Pacific", "Canada", "France"]
  }
};

export default DynamicPatternDetection;