// Local ML Analysis Service using TensorFlow.js
// Runs entirely in the browser - no API costs, full privacy

import * as tf from '@tensorflow/tfjs';

const LOCAL_STORAGE_KEY = 'ai_financial_analysis';

/**
 * Extract features from transactions for ML model
 */
const extractFeatures = (transactions) => {
  // Group transactions by month and category
  const monthlyData = {};
  const categories = new Set();
  
  console.log('Extracting features from', transactions.length, 'transactions');
  
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', tx.date);
      return;
    }
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const category = tx.category || 'Other';
    const amount = Number(tx.amount) || 0;
    
    categories.add(category);
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { cost: 0, revenue: 0, categories: {} };
    }
    
    if (!monthlyData[monthKey].categories[category]) {
      monthlyData[monthKey].categories[category] = { cost: 0, revenue: 0 };
    }
    
    if (tx.type === 'cost') {
      monthlyData[monthKey].cost += amount;
      monthlyData[monthKey].categories[category].cost += amount;
    } else {
      monthlyData[monthKey].revenue += amount;
      monthlyData[monthKey].categories[category].revenue += amount;
    }
  });
  
  console.log('Monthly data extracted:', Object.keys(monthlyData).length, 'months');
  console.log('Categories found:', Array.from(categories));
  
  return { monthlyData, categories: Array.from(categories) };
};

/**
 * Calculate statistics for analysis
 */
const calculateStatistics = (monthlyData, categories) => {
  const months = Object.keys(monthlyData).sort();
  
  // Calculate totals
  let totalCost = 0;
  let totalRevenue = 0;
  const categoryTotals = {};
  
  categories.forEach(cat => {
    categoryTotals[cat] = { cost: 0, revenue: 0, count: 0 };
  });
  
  months.forEach(month => {
    totalCost += monthlyData[month].cost;
    totalRevenue += monthlyData[month].revenue;
    
    categories.forEach(cat => {
      if (monthlyData[month].categories[cat]) {
        categoryTotals[cat].cost += monthlyData[month].categories[cat].cost;
        categoryTotals[cat].revenue += monthlyData[month].categories[cat].revenue;
        categoryTotals[cat].count++;
      }
    });
  });
  
  const numMonths = months.length || 1;
  const avgMonthlyCost = totalCost / numMonths;
  const avgMonthlyRevenue = totalRevenue / numMonths;
  
  console.log('Statistics calculated:', { totalCost, totalRevenue, avgMonthlyCost, avgMonthlyRevenue, numMonths });
  
  // Calculate trend
  let trend = 'stable';
  if (months.length >= 2) {
    const recentMonths = months.slice(-3);
    const recentCosts = recentMonths.map(m => monthlyData[m].cost);
    
    if (recentCosts.length >= 2) {
      const firstHalf = recentCosts.slice(0, Math.ceil(recentCosts.length / 2));
      const secondHalf = recentCosts.slice(Math.ceil(recentCosts.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
    }
  }
  
  // Get top spending categories
  const topCategories = Object.entries(categoryTotals)
    .filter(([_, data]) => data.cost > 0)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 3)
    .map(([cat, _]) => cat);
  
  return {
    avgMonthlyCost,
    avgMonthlyRevenue,
    totalCost,
    totalRevenue,
    trend,
    topCategories,
    categoryTotals,
    months,
    numMonths
  };
};

/**
 * Predict future values using simple exponential smoothing with fallback to averages
 */
const predictWithSmoothing = (values, periods = 3, alpha = 0.3, fallbackAverage = 0) => {
  // If no data or all zeros, use fallback average
  const nonZeroValues = values.filter(v => v > 0);
  
  if (nonZeroValues.length === 0) {
    // Use fallback average if provided
    if (fallbackAverage > 0) {
      return Array(periods).fill(fallbackAverage);
    }
    return Array(periods).fill(0);
  }
  
  if (nonZeroValues.length === 1) {
    return Array(periods).fill(nonZeroValues[0]);
  }
  
  // Simple exponential smoothing
  let forecast = values[0];
  for (let i = 1; i < values.length; i++) {
    forecast = alpha * values[i] + (1 - alpha) * forecast;
  }
  
  // If forecast is too low but we have history, use average
  const avg = nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length;
  if (forecast < avg * 0.1 && avg > 0) {
    forecast = avg;
  }
  
  // Calculate trend
  const recentValues = values.slice(-Math.min(6, values.length));
  let trendFactor = 0;
  if (recentValues.length >= 2) {
    const changes = [];
    for (let i = 1; i < recentValues.length; i++) {
      changes.push(recentValues[i] - recentValues[i - 1]);
    }
    trendFactor = changes.reduce((a, b) => a + b, 0) / changes.length;
    
    // Limit trend factor to prevent wild predictions
    const maxChange = avg * 0.2; // Max 20% change per period
    trendFactor = Math.max(-maxChange, Math.min(maxChange, trendFactor));
  }
  
  // Generate predictions with trend
  const predictions = [];
  for (let i = 0; i < periods; i++) {
    const predicted = Math.max(0, forecast + trendFactor * (i + 1));
    predictions.push(predicted);
  }
  
  console.log('Predictions generated:', predictions, 'from values:', values.slice(-5));
  
  return predictions;
};

/**
 * Build and train a simple neural network for predictions
 */
const buildAndTrainModel = async (monthlyData, categories) => {
  const months = Object.keys(monthlyData).sort();
  
  if (months.length < 3) {
    console.log('Not enough months for ML model:', months.length);
    return null;
  }
  
  // Prepare training data
  const windowSize = Math.min(3, months.length - 1);
  const xs = [];
  const ys = [];
  
  for (let i = windowSize; i < months.length; i++) {
    const inputWindow = [];
    for (let j = i - windowSize; j < i; j++) {
      inputWindow.push(monthlyData[months[j]].cost / 1000);
      inputWindow.push(monthlyData[months[j]].revenue / 1000);
    }
    xs.push(inputWindow);
    ys.push([
      monthlyData[months[i]].cost / 1000,
      monthlyData[months[i]].revenue / 1000
    ]);
  }
  
  if (xs.length < 2) {
    console.log('Not enough training samples:', xs.length);
    return null;
  }
  
  console.log('Training ML model with', xs.length, 'samples');
  
  // Create model
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [windowSize * 2], units: 16, activation: 'relu' }),
      tf.layers.dense({ units: 8, activation: 'relu' }),
      tf.layers.dense({ units: 2 })
    ]
  });
  
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError'
  });
  
  // Train
  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.tensor2d(ys);
  
  await model.fit(xsTensor, ysTensor, {
    epochs: 100,
    verbose: 0
  });
  
  // Cleanup tensors
  xsTensor.dispose();
  ysTensor.dispose();
  
  return model;
};

/**
 * Generate predictions using the trained model
 */
const generateMLPredictions = async (model, monthlyData, months, windowSize = 3) => {
  if (!model || months.length < windowSize) return null;
  
  const predictions = [];
  let lastWindow = [];
  
  // Get last window of data
  for (let j = months.length - windowSize; j < months.length; j++) {
    lastWindow.push(monthlyData[months[j]].cost / 1000);
    lastWindow.push(monthlyData[months[j]].revenue / 1000);
  }
  
  // Predict 3 months
  for (let i = 0; i < 3; i++) {
    const input = tf.tensor2d([lastWindow]);
    const prediction = model.predict(input);
    const values = await prediction.data();
    
    const predictedCost = Math.max(0, values[0] * 1000);
    const predictedRevenue = Math.max(0, values[1] * 1000);
    
    predictions.push({ cost: predictedCost, revenue: predictedRevenue });
    
    // Shift window for next prediction
    lastWindow = lastWindow.slice(2);
    lastWindow.push(predictedCost / 1000);
    lastWindow.push(predictedRevenue / 1000);
    
    input.dispose();
    prediction.dispose();
  }
  
  console.log('ML predictions:', predictions);
  
  return predictions;
};

/**
 * Get next 3 month names
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
 * Determine category trend
 */
const getCategoryTrend = (monthlyData, months, category) => {
  if (months.length < 2) return 'stable';
  
  const values = months.map(m => 
    monthlyData[m].categories[category]?.cost || 0
  );
  
  const recentValues = values.slice(-3);
  if (recentValues.length < 2) return 'stable';
  
  const firstHalf = recentValues.slice(0, Math.ceil(recentValues.length / 2));
  const secondHalf = recentValues.slice(Math.ceil(recentValues.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
  
  if (secondAvg > firstAvg * 1.15) return 'up';
  if (secondAvg < firstAvg * 0.85) return 'down';
  return 'stable';
};

/**
 * Generate category recommendations
 */
const getRecommendation = (category, trend, avgCost, avgRevenue) => {
  if (trend === 'up' && avgCost > 0) {
    return `${category} spending is increasing. Consider setting a budget limit.`;
  }
  if (trend === 'down' && avgCost > 0) {
    return `Good job! ${category} spending is decreasing.`;
  }
  if (avgCost > avgRevenue && avgRevenue > 0) {
    return `${category} costs exceed revenue. Review expenses.`;
  }
  return `${category} spending is stable.`;
};

/**
 * Main analysis function - uses local ML model
 */
export const analyzeFinances = async (transactions) => {
  console.log('Starting analysis with', transactions?.length, 'transactions');
  
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions available for analysis.');
  }
  
  // Extract features
  const { monthlyData, categories } = extractFeatures(transactions);
  
  if (Object.keys(monthlyData).length === 0) {
    throw new Error('No valid transaction data found. Please add some transactions first.');
  }
  
  const stats = calculateStatistics(monthlyData, categories);
  const next3Months = getNext3Months();
  
  // Try ML predictions first, fall back to statistical
  let mlPredictions = null;
  try {
    const model = await buildAndTrainModel(monthlyData, categories);
    if (model) {
      mlPredictions = await generateMLPredictions(model, monthlyData, stats.months);
      model.dispose();
    }
  } catch (e) {
    console.warn('ML prediction failed, using statistical fallback:', e);
  }
  
  // Generate predictions per category
  const categoryPredictions = {};
  const categoryRevenuePredictions = {};
  
  categories.forEach(cat => {
    const costValues = stats.months.map(m => 
      monthlyData[m].categories[cat]?.cost || 0
    );
    const revenueValues = stats.months.map(m => 
      monthlyData[m].categories[cat]?.revenue || 0
    );
    
    // Calculate category average for fallback
    const catAvgCost = stats.categoryTotals[cat].cost / (stats.categoryTotals[cat].count || 1);
    const catAvgRevenue = stats.categoryTotals[cat].revenue / (stats.categoryTotals[cat].count || 1);
    
    categoryPredictions[cat] = predictWithSmoothing(costValues, 3, 0.3, catAvgCost);
    if (revenueValues.some(v => v > 0)) {
      categoryRevenuePredictions[cat] = predictWithSmoothing(revenueValues, 3, 0.3, catAvgRevenue);
    }
  });
  
  // Calculate total predictions
  let totalCostPredictions, totalRevenuePredictions;
  
  if (mlPredictions && mlPredictions.some(p => p.cost > 0 || p.revenue > 0)) {
    totalCostPredictions = mlPredictions.map(p => p.cost);
    totalRevenuePredictions = mlPredictions.map(p => p.revenue);
  } else {
    // Use statistical predictions with averages as fallback
    const costValues = stats.months.map(m => monthlyData[m].cost);
    const revenueValues = stats.months.map(m => monthlyData[m].revenue);
    
    totalCostPredictions = predictWithSmoothing(costValues, 3, 0.3, stats.avgMonthlyCost);
    totalRevenuePredictions = predictWithSmoothing(revenueValues, 3, 0.3, stats.avgMonthlyRevenue);
  }
  
  // If predictions are still 0 but we have historical data, use averages
  if (totalCostPredictions.every(v => v === 0) && stats.avgMonthlyCost > 0) {
    totalCostPredictions = Array(3).fill(stats.avgMonthlyCost);
  }
  if (totalRevenuePredictions.every(v => v === 0) && stats.avgMonthlyRevenue > 0) {
    totalRevenuePredictions = Array(3).fill(stats.avgMonthlyRevenue);
  }
  
  const netBalancePredictions = totalRevenuePredictions.map((rev, i) => 
    rev - totalCostPredictions[i]
  );
  
  console.log('Final predictions:', { totalCostPredictions, totalRevenuePredictions, netBalancePredictions });
  
  // Build category breakdown
  const categoryBreakdown = {};
  categories.forEach(cat => {
    const avgCost = stats.categoryTotals[cat].cost / (stats.categoryTotals[cat].count || 1);
    const avgRevenue = stats.categoryTotals[cat].revenue / (stats.categoryTotals[cat].count || 1);
    const trend = getCategoryTrend(monthlyData, stats.months, cat);
    
    categoryBreakdown[cat] = {
      currentAverage: avgCost || avgRevenue,
      predictedTrend: trend,
      recommendation: getRecommendation(cat, trend, avgCost, avgRevenue)
    };
  });
  
  // Generate insights
  const insights = [];
  
  if (stats.trend === 'increasing') {
    insights.push('Your overall spending has been increasing recently. Consider reviewing your expenses.');
  } else if (stats.trend === 'decreasing') {
    insights.push('Great job! Your spending has been decreasing. Keep up the good financial habits.');
  } else {
    insights.push('Your spending patterns are relatively stable.');
  }
  
  if (stats.topCategories.length > 0) {
    insights.push(`Your top spending categories are: ${stats.topCategories.join(', ')}.`);
  }
  
  const avgNetBalance = stats.avgMonthlyRevenue - stats.avgMonthlyCost;
  if (avgNetBalance > 0) {
    insights.push(`You typically save about ${avgNetBalance.toFixed(0)} ₼ per month. Consider increasing savings.`);
  } else if (avgNetBalance < 0) {
    insights.push(`You typically spend ${Math.abs(avgNetBalance).toFixed(0)} ₼ more than you earn. Review your budget.`);
  }
  
  // Add data quality insight
  if (stats.numMonths < 3) {
    insights.push(`Note: Analysis based on ${stats.numMonths} month(s) of data. Predictions improve with more history.`);
  }
  
  // Build final analysis object
  const analysis = {
    summary: {
      topSpendingCategories: stats.topCategories,
      averageMonthlySpending: stats.avgMonthlyCost,
      averageMonthlyRevenue: stats.avgMonthlyRevenue,
      spendingTrend: stats.trend,
      totalHistoricalCost: stats.totalCost,
      totalHistoricalRevenue: stats.totalRevenue
    },
    predictions: {
      months: next3Months,
      costs: categoryPredictions,
      revenue: Object.keys(categoryRevenuePredictions).length > 0 ? categoryRevenuePredictions : undefined,
      totalCost: totalCostPredictions,
      totalRevenue: totalRevenuePredictions,
      netBalance: netBalancePredictions
    },
    insights,
    categoryBreakdown,
    metadata: {
      analyzedAt: new Date().toISOString(),
      transactionCount: transactions.length,
      monthsAnalyzed: stats.numMonths,
      modelType: mlPredictions ? 'neural-network' : 'statistical'
    }
  };
  
  console.log('Analysis complete:', analysis);
  
  return analysis;
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
