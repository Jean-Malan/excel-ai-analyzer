// Column type detection and analysis suggestions

export const detectColumnType = (columnData, columnName = '') => {
  if (!columnData || columnData.length === 0) return 'unknown';
  
  // Clean data - remove empty values
  const cleanData = columnData.filter(val => val !== null && val !== undefined && val !== '');
  if (cleanData.length === 0) return 'empty';
  
  const sampleSize = Math.min(cleanData.length, 50); // Analyze up to 50 samples
  const samples = cleanData.slice(0, sampleSize);
  
  // Detection patterns
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
    phone: /^[\+]?[\d\s\-\(\)]{7,15}$/,
    url: /^https?:\/\/[^\s]+$/i,
    currency: /^\$?[\d,]+\.?\d*$/,
    percentage: /^\d+\.?\d*%$/,
    date: /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$|^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/,
    number: /^[\d,]+\.?\d*$/,
    rating: /^[1-5](\.\d)?$|^[1-9]|10$/,
    yesno: /^(yes|no|y|n|true|false|1|0)$/i,
    sentiment: /^(positive|negative|neutral|good|bad|excellent|poor|happy|sad|angry)$/i
  };
  
  // Count matches for each pattern
  const matches = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    matches[type] = samples.filter(val => pattern.test(String(val).trim())).length;
  }
  
  // Special checks based on column names
  const nameLower = columnName.toLowerCase();
  if (nameLower.includes('email') || nameLower.includes('mail')) return 'email';
  if (nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('tel')) return 'phone';
  if (nameLower.includes('url') || nameLower.includes('website') || nameLower.includes('link')) return 'url';
  if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) return 'currency';
  if (nameLower.includes('date') || nameLower.includes('time') || nameLower.includes('created')) return 'date';
  if (nameLower.includes('rating') || nameLower.includes('score') || nameLower.includes('stars')) return 'rating';
  if (nameLower.includes('sentiment') || nameLower.includes('feeling') || nameLower.includes('mood')) return 'sentiment';
  if (nameLower.includes('feedback') || nameLower.includes('review') || nameLower.includes('comment') || nameLower.includes('description')) return 'text_long';
  if (nameLower.includes('name') || nameLower.includes('title') || nameLower.includes('subject')) return 'text_short';
  if (nameLower.includes('category') || nameLower.includes('type') || nameLower.includes('status')) return 'category';
  
  // Determine best match based on percentage
  const threshold = 0.7; // 70% of samples must match
  const bestMatch = Object.entries(matches)
    .filter(([_, count]) => count / sampleSize >= threshold)
    .sort(([_, a], [__, b]) => b - a)[0];
  
  if (bestMatch) return bestMatch[0];
  
  // Fallback classification based on content analysis
  const avgLength = samples.reduce((sum, val) => sum + String(val).length, 0) / samples.length;
  
  if (avgLength > 100) return 'text_long';
  if (avgLength > 20) return 'text_medium';
  if (avgLength > 5) return 'text_short';
  
  return 'text_short';
};

export const getColumnTypeInfo = (type) => {
  const typeInfo = {
    email: { 
      label: '📧 Email', 
      description: 'Email addresses',
      color: 'bg-blue-100 text-blue-800' 
    },
    phone: { 
      label: '📱 Phone', 
      description: 'Phone numbers',
      color: 'bg-green-100 text-green-800' 
    },
    url: { 
      label: '🔗 URL', 
      description: 'Web addresses',
      color: 'bg-purple-100 text-purple-800' 
    },
    currency: { 
      label: '💰 Currency', 
      description: 'Money amounts',
      color: 'bg-yellow-100 text-yellow-800' 
    },
    percentage: { 
      label: '📊 Percentage', 
      description: 'Percentage values',
      color: 'bg-indigo-100 text-indigo-800' 
    },
    date: { 
      label: '📅 Date', 
      description: 'Date/time values',
      color: 'bg-red-100 text-red-800' 
    },
    number: { 
      label: '🔢 Number', 
      description: 'Numeric values',
      color: 'bg-gray-100 text-gray-800' 
    },
    rating: { 
      label: '⭐ Rating', 
      description: 'Rating scores',
      color: 'bg-orange-100 text-orange-800' 
    },
    yesno: { 
      label: '✅ Yes/No', 
      description: 'Boolean values',
      color: 'bg-teal-100 text-teal-800' 
    },
    sentiment: { 
      label: '😊 Sentiment', 
      description: 'Sentiment indicators',
      color: 'bg-pink-100 text-pink-800' 
    },
    text_long: { 
      label: '📝 Long Text', 
      description: 'Long text content',
      color: 'bg-slate-100 text-slate-800' 
    },
    text_medium: { 
      label: '📄 Medium Text', 
      description: 'Medium text content',
      color: 'bg-slate-100 text-slate-800' 
    },
    text_short: { 
      label: '🏷️ Short Text', 
      description: 'Short text content',
      color: 'bg-slate-100 text-slate-800' 
    },
    category: { 
      label: '🏪 Category', 
      description: 'Category/classification',
      color: 'bg-violet-100 text-violet-800' 
    },
    empty: { 
      label: '⚪ Empty', 
      description: 'No data detected',
      color: 'bg-gray-100 text-gray-500' 
    },
    unknown: { 
      label: '❓ Unknown', 
      description: 'Unknown data type',
      color: 'bg-gray-100 text-gray-500' 
    }
  };
  
  return typeInfo[type] || typeInfo.unknown;
};

export const suggestAnalysisPrompts = (columnTypes, selectedColumns, headers) => {
  const suggestions = [];
  const selectedTypes = selectedColumns.map(index => ({
    index,
    name: headers[index],
    type: columnTypes[index]
  }));
  
  // Sentiment analysis suggestions
  const textColumns = selectedTypes.filter(col => 
    ['text_long', 'text_medium', 'sentiment'].includes(col.type)
  );
  
  if (textColumns.length > 0) {
    suggestions.push({
      category: 'Sentiment Analysis',
      icon: '😊',
      prompts: [
        {
          title: 'Basic Sentiment Analysis',
          description: 'Classify text as positive, negative, or neutral',
          prompt: `Analyze the sentiment of the provided text. Return only one word: "Positive", "Negative", or "Neutral".`,
          suitable: textColumns.map(col => col.name)
        },
        {
          title: 'Detailed Sentiment with Score',
          description: 'Get sentiment with confidence score (1-10)',
          prompt: `Analyze the sentiment and provide: 1) Sentiment (Positive/Negative/Neutral) 2) Confidence score (1-10). Format: "Positive (8)"`,
          suitable: textColumns.map(col => col.name)
        },
        {
          title: 'Emotion Detection',
          description: 'Detect specific emotions in text',
          prompt: `Identify the primary emotion in this text. Choose from: Joy, Sadness, Anger, Fear, Surprise, Disgust, Trust, Anticipation, or Neutral.`,
          suitable: textColumns.map(col => col.name)
        }
      ]
    });
  }
  
  // Content analysis suggestions
  if (textColumns.length > 0) {
    suggestions.push({
      category: 'Content Analysis',
      icon: '🔍',
      prompts: [
        {
          title: 'Topic Extraction',
          description: 'Extract the main topic or theme',
          prompt: `Extract the main topic or theme from this text in 1-3 words. Be specific and concise.`,
          suitable: textColumns.map(col => col.name)
        },
        {
          title: 'Key Information Extraction',
          description: 'Extract specific information like names, dates, amounts',
          prompt: `Extract key information from this text (names, dates, amounts, locations). Format as a brief summary.`,
          suitable: textColumns.map(col => col.name)
        },
        {
          title: 'Content Summarization',
          description: 'Create concise summaries of long text',
          prompt: `Summarize this text in exactly one sentence, capturing the main point.`,
          suitable: textColumns.filter(col => col.type === 'text_long').map(col => col.name)
        }
      ]
    });
  }
  
  // Classification suggestions
  const categoryColumns = selectedTypes.filter(col => 
    ['text_short', 'text_medium', 'category'].includes(col.type)
  );
  
  if (categoryColumns.length > 0) {
    suggestions.push({
      category: 'Classification & Categorization',
      icon: '🏷️',
      prompts: [
        {
          title: 'Industry Classification',
          description: 'Classify businesses by industry',
          prompt: `Classify this business/company into one industry category. Choose from: Technology, Healthcare, Finance, Retail, Manufacturing, Education, Real Estate, Food & Beverage, Other.`,
          suitable: categoryColumns.map(col => col.name)
        },
        {
          title: 'Priority Level Assignment',
          description: 'Assign priority levels (High/Medium/Low)',
          prompt: `Assign a priority level based on this information. Return only: "High", "Medium", or "Low".`,
          suitable: selectedTypes.map(col => col.name)
        },
        {
          title: 'Quality Assessment',
          description: 'Assess quality or condition',
          prompt: `Assess the quality based on this information. Return: "Excellent", "Good", "Fair", or "Poor".`,
          suitable: selectedTypes.map(col => col.name)
        }
      ]
    });
  }
  
  // Data validation suggestions
  const emailColumns = selectedTypes.filter(col => col.type === 'email');
  const phoneColumns = selectedTypes.filter(col => col.type === 'phone');
  
  if (emailColumns.length > 0 || phoneColumns.length > 0) {
    suggestions.push({
      category: 'Data Validation',
      icon: '✅',
      prompts: [
        {
          title: 'Email Validation',
          description: 'Check if email addresses are valid',
          prompt: `Check if this email address appears to be valid and professional. Return "Valid" or "Invalid" with brief reason.`,
          suitable: emailColumns.map(col => col.name)
        },
        {
          title: 'Contact Information Cleanup',
          description: 'Standardize and clean contact info',
          prompt: `Standardize this contact information into a clean, consistent format. Fix any obvious errors.`,
          suitable: [...emailColumns, ...phoneColumns].map(col => col.name)
        }
      ]
    });
  }
  
  // Scoring and rating suggestions
  const ratingColumns = selectedTypes.filter(col => col.type === 'rating');
  
  if (textColumns.length > 0) {
    suggestions.push({
      category: 'Scoring & Rating',
      icon: '⭐',
      prompts: [
        {
          title: 'Customer Satisfaction Score',
          description: 'Rate customer satisfaction (1-10)',
          prompt: `Based on this feedback, rate the customer satisfaction on a scale of 1-10, where 1 is very dissatisfied and 10 is very satisfied. Return only the number.`,
          suitable: textColumns.map(col => col.name)
        },
        {
          title: 'Lead Quality Score',
          description: 'Score lead quality for sales',
          prompt: `Score this lead's quality from 1-10 based on the provided information, where 1 is poor quality and 10 is excellent quality. Return only the number.`,
          suitable: selectedTypes.map(col => col.name)
        },
        {
          title: 'Content Quality Assessment',
          description: 'Rate content quality (1-5 stars)',
          prompt: `Rate the quality of this content from 1-5 stars, where 1 is poor and 5 is excellent. Consider clarity, usefulness, and completeness. Return format: "4 stars"`,
          suitable: textColumns.map(col => col.name)
        }
      ]
    });
  }
  
  return suggestions;
};

export const analyzeDataPatterns = (sheetData, headers) => {
  const columnTypes = {};
  const patterns = {};
  
  headers.forEach((header, index) => {
    const columnData = sheetData.map(row => row[index]).filter(val => val != null);
    columnTypes[index] = detectColumnType(columnData, header);
    
    // Additional pattern analysis
    patterns[index] = {
      uniqueValues: new Set(columnData).size,
      totalValues: columnData.length,
      emptyValues: sheetData.length - columnData.length,
      avgLength: columnData.length > 0 ? columnData.reduce((sum, val) => sum + String(val).length, 0) / columnData.length : 0
    };
  });
  
  return { columnTypes, patterns };
};