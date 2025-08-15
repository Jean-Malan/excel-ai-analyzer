/**
 * Test script for Dynamic Category Manager
 * Run with: node test-dynamic-categories.js
 */

import DynamicCategoryManager from './src/services/dynamicCategoryManager.js';

// Mock API key for testing (you'll need to provide a real one)
const API_KEY = 'your-openai-api-key-here';

async function testDynamicCategorization() {
  console.log('🧪 Testing Dynamic Category Manager...\n');

  // Mock logger
  const logger = (type, message, data) => {
    console.log(`[${type.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };

  // Initialize the category manager
  const categoryManager = new DynamicCategoryManager(API_KEY, 'gpt-4o-mini-2024-07-18', logger);

  // Test data - business companies
  const testData = [
    'Apple Inc. - Technology company specializing in consumer electronics and software',
    'Goldman Sachs - Global investment banking and financial services',
    'Kaiser Permanente - Healthcare provider and health insurance organization',
    'Microsoft Corporation - Technology company focusing on software and cloud services',
    'JPMorgan Chase - Banking and financial services company',
    'Google LLC - Technology company specializing in internet services and advertising',
    'Mayo Clinic - Medical practice and medical research group',
    'Wells Fargo - Banking and financial services corporation',
    'Amazon Web Services - Cloud computing and technology services',
    'Blue Cross Blue Shield - Health insurance provider'
  ];

  // Predefined categories to start with
  const predefinedCategories = ['Technology', 'Finance', 'Healthcare'];

  try {
    console.log('📊 Starting categorization with predefined categories:', predefinedCategories);
    console.log('📋 Test data items:', testData.length);
    console.log('\n' + '='.repeat(60) + '\n');

    // Run the dynamic categorization
    const result = await categoryManager.categorizeWithDynamicReuse(
      testData,
      predefinedCategories,
      'Business industry classification'
    );

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ Categorization Results:');
    console.log('='.repeat(25));

    // Display results
    result.results.forEach((item, index) => {
      console.log(`${index + 1}. "${testData[index]}"`);
      console.log(`   → Category: ${item.category}`);
      console.log(`   → Confidence: ${(item.confidence * 100).toFixed(1)}%`);
      console.log(`   → Reasoning: ${item.reasoning}`);
      console.log(`   → Is New: ${item.isNew ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Display statistics
    console.log('\n📈 Category Statistics:');
    console.log('='.repeat(22));
    console.log(`Total Categories: ${result.categoryStats.totalCategories}`);
    console.log(`Total Items: ${result.categoryStats.totalItems}`);
    console.log(`New Categories: ${result.categoryStats.newCategories}`);
    console.log(`Predefined Categories: ${result.categoryStats.predefinedCategories}`);

    console.log('\n📊 Category Distribution:');
    result.categoryStats.categories.forEach(cat => {
      console.log(`- ${cat.name}: ${cat.count} items (${((cat.count / result.categoryStats.totalItems) * 100).toFixed(1)}%)`);
      console.log(`  ${cat.isPredefined ? '🟡 Predefined' : '🟣 AI Created'}`);
      console.log(`  Description: ${cat.description}`);
      console.log('');
    });

    // Test export functionality
    console.log('\n💾 Testing Export/Import:');
    const exportData = categoryManager.exportCategories();
    console.log('Categories exported successfully');
    console.log(`Export contains ${Object.keys(exportData.dynamicCategories).length} categories`);

    // Test with a new category manager to verify import
    const newCategoryManager = new DynamicCategoryManager(API_KEY, 'gpt-4o-mini-2024-07-18', logger);
    newCategoryManager.importCategories(exportData);
    console.log('Categories imported successfully to new instance');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Check if API key is provided
if (API_KEY === 'your-openai-api-key-here') {
  console.log('⚠️ Please provide a real OpenAI API key in the API_KEY variable to run this test.');
  console.log('The test will simulate the categorization process but won\'t make actual API calls.');
  
  // Run a mock test
  console.log('\n🧪 Running mock test...\n');
  const mockResult = {
    results: [
      { category: 'Technology', confidence: 0.95, reasoning: 'Computer hardware and software company', isNew: false },
      { category: 'Finance', confidence: 0.92, reasoning: 'Investment banking services', isNew: false },
      { category: 'Healthcare', confidence: 0.88, reasoning: 'Medical services provider', isNew: false }
    ],
    categoryStats: {
      totalCategories: 3,
      totalItems: 10,
      newCategories: 0,
      predefinedCategories: 3,
      categories: [
        { name: 'Technology', count: 4, isPredefined: true, description: 'Technology companies' },
        { name: 'Finance', count: 3, isPredefined: true, description: 'Financial services' },
        { name: 'Healthcare', count: 3, isPredefined: true, description: 'Healthcare providers' }
      ]
    }
  };
  
  console.log('Mock results:', JSON.stringify(mockResult, null, 2));
} else {
  // Run the actual test
  testDynamicCategorization();
}