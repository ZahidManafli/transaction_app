// Gemini Analysis Service for Financial Predictions

const LOCAL_STORAGE_KEY = 'ai_financial_analysis';

/**
 * Prepare transaction summary for AI analysis
 */
const prepareTransactionSummary = (transactions) => {
  // Group transactions by category and type
  const categoryStats = {};
  const monthlyStats = {};
  
  transactions.forEach(tx => {
    const category = tx.category || 'Other';
    const type = tx.type; // 'cost' or 'revenue'
    const amount = tx.amount;
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Category stats
    if (!categoryStats[category]) {
      categoryStats[category] = { totalCost: 0, totalRevenue: 0, count: 0 };
    }
    if (type === 'cost') {
      categoryStats[category].totalCost += amount;
    } else {
      categoryStats[category].totalRevenue += amount;
    }
    categoryStats[category].count++;
    
    // Monthly stats
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { cost: 0, revenue: 0, categories: {} };
    }
    if (type === 'cost') {
      monthlyStats[monthKey].cost += amount;
    } else {
      monthlyStats[monthKey].revenue += amount;
    }
    
    if (!monthlyStats[monthKey].categories[category]) {
      monthlyStats[monthKey].categories[category] = { cost: 0, revenue: 0 };
    }
    if (type === 'cost') {
      monthlyStats[monthKey].categories[category].cost += amount;
    } else {
      monthlyStats[monthKey].categories[category].revenue += amount;
    }
  });
  
  return { categoryStats, monthlyStats };
};

/**
 * Generate the next 3 months from current date
 */
const getNext3Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthName = futureDate.toLocaleString('default', { month: 'short' });
    const year = futureDate.getFullYear();
    months.push(`${monthName} ${year}`);
  }
  return months;
};

/**
 * Call Google Gemini API for financial analysis
 */
export const analyzeFinances = async (transactions) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file. Get your free API key from: https://aistudio.google.com/app/apikey');
  }
  
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions available for analysis.');
  }
  
  const { categoryStats, monthlyStats } = prepareTransactionSummary(transactions);
  const next3Months = getNext3Months();
  
  const prompt = `You are a financial analyst AI. Analyze the following transaction data and provide predictions for the next 3 months.

TRANSACTION SUMMARY BY CATEGORY:
${JSON.stringify(categoryStats, null, 2)}

MONTHLY TRANSACTION HISTORY:
${JSON.stringify(monthlyStats, null, 2)}

NEXT 3 MONTHS TO PREDICT: ${next3Months.join(', ')}

Based on this data, provide a JSON response with the following structure:
{
  "summary": {
    "topSpendingCategories": ["category1", "category2", "category3"],
    "averageMonthlySpending": <number>,
    "averageMonthlyRevenue": <number>,
    "spendingTrend": "increasing" | "decreasing" | "stable"
  },
  "predictions": {
    "months": ["${next3Months[0]}", "${next3Months[1]}", "${next3Months[2]}"],
    "costs": {
      "<category>": [<month1>, <month2>, <month3>]
    },
    "revenue": {
      "<category>": [<month1>, <month2>, <month3>]
    },
    "totalCost": [<month1>, <month2>, <month3>],
    "totalRevenue": [<month1>, <month2>, <month3>],
    "netBalance": [<month1>, <month2>, <month3>]
  },
  "insights": [
    "<insight about spending patterns>",
    "<insight about potential savings>",
    "<recommendation for financial health>"
  ],
  "categoryBreakdown": {
    "<category>": {
      "currentAverage": <number>,
      "predictedTrend": "up" | "down" | "stable",
      "recommendation": "<brief recommendation>"
    }
  }
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting or code blocks
- Use realistic predictions based on the historical data patterns
- Include all categories that have significant transactions
- Amounts should be in the same currency (AZN/₼)`;

  // Gemini API endpoint
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Extract content from Gemini response format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No response content from Gemini');
    }
    
    // Parse JSON response (handle potential markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();
    
    const analysis = JSON.parse(jsonContent);
    
    // Add metadata
    analysis.metadata = {
      analyzedAt: new Date().toISOString(),
      transactionCount: transactions.length,
      monthsAnalyzed: Object.keys(monthlyStats).length
    };
    
    return analysis;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    throw error;
  }
};

/**
 * Save analysis to localStorage
 */
export const saveAnalysis = (analysis) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(analysis));
    return true;
  } catch (error) {
    console.error('Failed to save analysis to localStorage:', error);
    return false;
  }
};

/**
 * Load analysis from localStorage
 */
export const loadAnalysis = () => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Failed to load analysis from localStorage:', error);
    return null;
  }
};

/**
 * Clear analysis from localStorage
 */
export const clearAnalysis = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear analysis from localStorage:', error);
    return false;
  }
};

/**
 * Check if analysis exists and is recent (less than 24 hours old)
 */
export const hasRecentAnalysis = () => {
  const analysis = loadAnalysis();
  if (!analysis || !analysis.metadata?.analyzedAt) {
    return false;
  }
  
  const analyzedAt = new Date(analysis.metadata.analyzedAt);
  const now = new Date();
  const hoursDiff = (now - analyzedAt) / (1000 * 60 * 60);
  
  return hoursDiff < 24;
};
