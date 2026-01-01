import { useState, useMemo } from "react";

export default function TransactionList({ transactions, onDeleteTransaction, currentCard, onToggleIncludeInExpected }) {
  const [filter, setFilter] = useState("all"); // "daily", "weekly", "monthly", "all"
  const [viewMode, setViewMode] = useState("list"); // "list" or "graph"
  const [transactionTab, setTransactionTab] = useState("current"); // "current" or "scheduled"
  const [hoveredMonth, setHoveredMonth] = useState(null); // Index of hovered month
  const [hoveredDay, setHoveredDay] = useState(null); // Index of hovered day for daily graph
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // Mouse position for tooltip
  const [selectedMonth, setSelectedMonth] = useState("all"); // For scheduled tab monthly filter
  const [graphType, setGraphType] = useState("monthly"); // "monthly" or "daily"
  
  // Daily graph selectors
  const now = new Date();
  const [dailyYear, setDailyYear] = useState(now.getFullYear());
  const [dailyMonth, setDailyMonth] = useState(now.getMonth() + 1); // 1-12

  // Separate transactions into current and scheduled
  // Current: transactions that have affected the balance (isAffect === true)
  // Scheduled: transactions that are scheduled but not yet affected (scheduled === true && isAffect === false)
  const { currentTransactions, scheduledTransactions } = useMemo(() => {
    const current = transactions.filter(tx => tx.isAffect === true);
    const scheduled = transactions.filter(tx => tx.scheduled === true && tx.isAffect === false);
    return { currentTransactions: current, scheduledTransactions: scheduled };
  }, [transactions]);

  // Use appropriate transaction list based on active tab
  const activeTransactions = transactionTab === "current" ? currentTransactions : scheduledTransactions;

  // Get unique months from scheduled transactions for dropdown
  const scheduledMonths = useMemo(() => {
    const monthSet = new Set();
    scheduledTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(monthKey);
    });
    return Array.from(monthSet).sort();
  }, [scheduledTransactions]);

  // Filter transactions based on selected period (only for current transactions)
  // For scheduled tab, filter by selected month
  const filteredTransactions = useMemo(() => {
    if (transactionTab === "scheduled") {
      if (selectedMonth === "all") return activeTransactions;
      
      return activeTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonthKey === selectedMonth;
      });
    }
    
    // Current transactions filtering
    const transactionsToFilter = activeTransactions;
    
    if (filter === "all") return transactionsToFilter;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return transactionsToFilter.filter(tx => {
      const txDate = new Date(tx.date);
      const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), 0, 0, 0, 0);
      
      if (filter === "daily") {
        // Today's transactions
        return txDateOnly.getTime() === todayStart.getTime();
      } else if (filter === "weekly") {
        // Last 7 days
        const weekAgo = new Date(todayStart);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return txDateOnly >= weekAgo;
      } else if (filter === "monthly") {
        // Last 30 days
        const monthAgo = new Date(todayStart);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return txDateOnly >= monthAgo;
      }
      return true;
    });
  }, [activeTransactions, filter, transactionTab, selectedMonth]);

  // Calculate total revenue (all revenue - all costs) - only for current transactions
  const totalRevenue = useMemo(() => {
    if (transactionTab === "scheduled") return 0; // Scheduled transactions don't affect totals
    return filteredTransactions.reduce((sum, tx) => {
      if (tx.type === "revenue") {
        return sum + tx.amount;
      } else {
        return sum - tx.amount;
      }
    }, 0);
  }, [filteredTransactions, transactionTab]);

  const formattedRevenue = totalRevenue.toFixed(2).replace(".", ",");

  // Calculate expected revenue for scheduled transactions (only include transactions with includeInExpected === true)
  // When a month is selected, include all transactions up to and including that month
  const expectedRevenue = useMemo(() => {
    if (transactionTab !== "scheduled") return { revenue: 0, cost: 0, net: 0 };
    
    // Filter scheduled transactions based on selected month
    let transactionsToCalculate = scheduledTransactions;
    
    if (selectedMonth !== "all") {
      // Parse the selected month to get year and month
      const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
      const selectedMonthDate = new Date(selectedYear, selectedMonthNum - 1, 1);
      
      // Include all transactions up to and including the selected month
      transactionsToCalculate = scheduledTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonthDate = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
        return txMonthDate <= selectedMonthDate;
      });
    }
    
    return transactionsToCalculate.reduce((acc, tx) => {
      // Only include transactions that are marked to be included in expected revenue
      if (tx.includeInExpected !== false) {
        if (tx.type === "revenue") {
          acc.revenue += tx.amount;
        } else {
          acc.cost += tx.amount;
        }
        acc.net = acc.revenue - acc.cost;
      }
      return acc;
    }, { revenue: 0, cost: 0, net: 0 });
  }, [scheduledTransactions, transactionTab, selectedMonth]);

  // Calculate projected balance after scheduled transactions
  const projectedBalance = useMemo(() => {
    if (!currentCard || transactionTab !== "scheduled") return null;
    const currentBalance = currentCard.amount || 0;
    return currentBalance + expectedRevenue.net;
  }, [currentCard, expectedRevenue.net, transactionTab]);

  // Process monthly data for graph - current transactions
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map();
    
    currentTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthLabel = `${monthName} ${year}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          cost: 0,
          revenue: 0,
          netRevenue: 0
        });
      }
      
      const monthData = monthlyMap.get(monthKey);
      if (tx.type === "cost") {
        monthData.cost += tx.amount;
      } else {
        monthData.revenue += tx.amount;
      }
    });
    
    // Calculate net revenue (revenue - cost) for each month
    monthlyMap.forEach((data) => {
      data.netRevenue = data.revenue - data.cost;
    });
    
    // Sort by month key and return array
    const sortedData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => data);
    
    // Calculate cumulative total revenue
    let runningTotal = 0;
    sortedData.forEach((data) => {
      runningTotal += data.netRevenue;
      data.totalRevenue = runningTotal;
    });
    
    return sortedData;
  }, [currentTransactions]);

  // Process monthly data for scheduled transactions graph
  const scheduledMonthlyData = useMemo(() => {
    const monthlyMap = new Map();
    
    scheduledTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthLabel = `${monthName} ${year}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          cost: 0,
          revenue: 0,
          netRevenue: 0
        });
      }
      
      const monthData = monthlyMap.get(monthKey);
      if (tx.type === "cost") {
        monthData.cost += tx.amount;
      } else {
        monthData.revenue += tx.amount;
      }
    });
    
    // Calculate net revenue (revenue - cost) for each month
    monthlyMap.forEach((data) => {
      data.netRevenue = data.revenue - data.cost;
    });
    
    // Sort by month key and return array
    const sortedData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => data);
    
    // Calculate cumulative total revenue
    let runningTotal = 0;
    sortedData.forEach((data) => {
      runningTotal += data.netRevenue;
      data.totalRevenue = runningTotal;
    });
    
    return sortedData;
  }, [scheduledTransactions]);

  // Get available years from transactions for daily graph
  const availableYears = useMemo(() => {
    const yearSet = new Set();
    const allTx = transactionTab === "current" ? currentTransactions : scheduledTransactions;
    allTx.forEach(tx => {
      const date = new Date(tx.date);
      yearSet.add(date.getFullYear());
    });
    // Add current year if not present
    yearSet.add(new Date().getFullYear());
    return Array.from(yearSet).sort((a, b) => b - a); // Descending
  }, [currentTransactions, scheduledTransactions, transactionTab]);

  // Process daily data for graph - excludes Salary and Kredit categories
  const dailyData = useMemo(() => {
    const dailyMap = new Map();
    const allTx = transactionTab === "current" ? currentTransactions : scheduledTransactions;
    
    // Filter by selected year/month and exclude Salary and Kredit
    const filteredTx = allTx.filter(tx => {
      const date = new Date(tx.date);
      const matchesYearMonth = date.getFullYear() === dailyYear && (date.getMonth() + 1) === dailyMonth;
      const isExcludedCategory = tx.category === "Salary" || tx.category === "Kredit";
      return matchesYearMonth && !isExcludedCategory;
    });
    
    // Get number of days in the selected month
    const daysInMonth = new Date(dailyYear, dailyMonth, 0).getDate();
    
    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap.set(day, {
        day: day,
        cost: 0,
        revenue: 0,
        netRevenue: 0
      });
    }
    
    // Populate with transaction data
    filteredTx.forEach(tx => {
      const date = new Date(tx.date);
      const day = date.getDate();
      
      const dayData = dailyMap.get(day);
      if (dayData) {
        if (tx.type === "cost") {
          dayData.cost += tx.amount;
        } else {
          dayData.revenue += tx.amount;
        }
      }
    });
    
    // Calculate net revenue for each day
    dailyMap.forEach((data) => {
      data.netRevenue = data.revenue - data.cost;
    });
    
    return Array.from(dailyMap.values());
  }, [currentTransactions, scheduledTransactions, transactionTab, dailyYear, dailyMonth]);

  // Get active monthly data based on tab
  const activeMonthlyData = transactionTab === "current" ? monthlyData : scheduledMonthlyData;

  // Get icon and background color based on category
  const getTransactionIcon = (category, type) => {
    if (category === "Markets") {
      // Shopping cart icon for markets
      return (
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.293 1.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    } else if (category === "Transfers") {
      // Stylized transfer icon
      return (
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="6" width="16" height="12" rx="1" stroke="#dc2626" strokeWidth="2" fill="none"/>
            <path d="M8 10h8M8 14h6" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 6v12" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      );
    } else if (category === "Parking") {
      // Parking/P car icon
      return (
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#3b82f6" strokeWidth="2" fill="none"/>
            <path d="M8 4v16M8 8h8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="2" stroke="#3b82f6" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      );
    } else if (category === "Salary") {
      // Money/dollar icon for salary
      return (
        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 110 7H6" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    } else if (category === "Kredit") {
      // Credit card icon for kredit
      return (
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="4" width="22" height="16" rx="2" stroke="#6366f1" strokeWidth="2" fill="none"/>
            <path d="M1 10h22" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="7" cy="15" r="1.5" fill="#6366f1"/>
            <circle cx="11" cy="15" r="1.5" fill="#6366f1"/>
          </svg>
        </div>
      );
    } else if (category === "Enjoyment") {
      // Entertainment/star icon for enjoyment
      return (
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    } else {
      // Hexagonal icon for other categories
      return (
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }
  };

  // Parse date to extract time
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return dateString.split(" ")[1] || "00:00";
    }
  };

  // Format date for current transactions: "19 December 18:00"
  const formatDateWithTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const monthName = date.toLocaleString('default', { month: 'long' });
      const time = formatTime(dateString);
      return `${day} ${monthName} ${time}`;
    } catch {
      return dateString;
    }
  };

  // Render Monthly Line Graph Component
  const renderMonthlyGraph = (data) => {
    if (data.length === 0) {
      return <div className="text-center text-gray-500 py-8">No data available for graph</div>;
    }

    // Calculate max and min values for scaling (netRevenue and totalRevenue can be negative)
    const allValues = data.flatMap(d => [d.cost, d.revenue, d.netRevenue, d.totalRevenue]);
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);
    const valueRange = maxValue - minValue || 1;
    
    const graphHeight = 300;
    const graphWidth = Math.max(400, data.length * 80);
    const padding = 50;
    const chartHeight = graphHeight - padding * 2;
    const chartWidth = graphWidth - padding * 2;

    // Helper function to calculate Y position (handles negative values)
    const getYPosition = (value) => {
      const normalizedValue = (value - minValue) / valueRange;
      return padding + chartHeight - (normalizedValue * chartHeight);
    };

    // Calculate points for lines
    const costPoints = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.cost);
      return { x, y };
    });

    const revenuePoints = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.revenue);
      return { x, y };
    });

    const netRevenuePoints = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.netRevenue);
      return { x, y };
    });

    const totalRevenuePoints = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.totalRevenue);
      return { x, y };
    });

    // Create path strings
    const costPath = costPoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const revenuePath = revenuePoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const netRevenuePath = netRevenuePoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const totalRevenuePath = totalRevenuePoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const handlePointHover = (monthIndex, event) => {
      setHoveredMonth(monthIndex);
      setMousePosition({
        x: event.clientX,
        y: event.clientY
      });
    };

    const handlePointLeave = () => {
      setHoveredMonth(null);
    };

    return (
      <div className="w-full relative">
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-600"></div>
              <span className="text-sm text-gray-700">Spending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-yellow-500"></div>
              <span className="text-sm text-gray-700">Money Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span className="text-sm text-gray-700">Net Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-600"></div>
              <span className="text-sm text-gray-700">Total Revenue</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto relative">
          <svg 
            viewBox={`0 0 ${graphWidth} ${graphHeight}`} 
            className="w-full h-80"
            preserveAspectRatio="none"
            onMouseLeave={handlePointLeave}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + chartHeight - (ratio * chartHeight);
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}

            {/* Cost line */}
            <path
              d={costPath}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Revenue line (Money Added) - Yellow */}
            <path
              d={revenuePath}
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Net Revenue line - Blue */}
            <path
              d={netRevenuePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Total Revenue line - Green */}
            <path
              d={totalRevenuePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Zero line (for reference when net revenue is negative) */}
            {minValue < 0 && (
              <line
                x1={padding}
                y1={getYPosition(0)}
                x2={padding + chartWidth}
                y2={getYPosition(0)}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* Cost points */}
            {costPoints.map((point, i) => (
              <circle
                key={`cost-${i}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#dc2626"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* Revenue points (Money Added) - Yellow */}
            {revenuePoints.map((point, i) => (
              <circle
                key={`revenue-${i}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#eab308"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* Net Revenue points - Blue */}
            {netRevenuePoints.map((point, i) => (
              <circle
                key={`netRevenue-${i}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#2563eb"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* Total Revenue points - Green */}
            {totalRevenuePoints.map((point, i) => (
              <circle
                key={`totalRevenue-${i}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#10b981"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* X-axis labels */}
            {data.map((d, i) => {
              const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
              return (
                <text
                  key={i}
                  x={x}
                  y={graphHeight - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {d.month}
                </text>
              );
            })}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = minValue + (valueRange * ratio);
              const y = getYPosition(value);
              return (
                <text
                  key={ratio}
                  x={padding - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {value.toFixed(0)}
                </text>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredMonth !== null && data[hoveredMonth] && (
            <div
              className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 pointer-events-none"
              style={{
                left: `${mousePosition.x + 15}px`,
                top: `${mousePosition.y - 10}px`,
                transform: 'translateY(-50%)',
                minWidth: '180px',
                maxWidth: '220px'
              }}
            >
              <div className="font-semibold text-gray-900 mb-2 border-b pb-2">
                {data[hoveredMonth].month}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Spending:</span>
                  <span className="text-red-600 font-semibold">{data[hoveredMonth].cost.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Money Added:</span>
                  <span className="text-yellow-600 font-semibold">{data[hoveredMonth].revenue.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Revenue:</span>
                  <span className={`font-semibold ${data[hoveredMonth].netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data[hoveredMonth].netRevenue.toFixed(2)} ₼
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-gray-600 font-semibold">Total Revenue:</span>
                  <span className={`font-semibold ${data[hoveredMonth].totalRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data[hoveredMonth].totalRevenue.toFixed(2)} ₼
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {data.map((d, i) => (
            <div key={i} className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-900">{d.month}</div>
              <div className="text-red-600 mt-1">Spending: {d.cost.toFixed(2)} ₼</div>
              <div className="text-yellow-600">Money Added: {d.revenue.toFixed(2)} ₼</div>
              <div className={`mt-1 ${d.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net Revenue: {d.netRevenue.toFixed(2)} ₼
              </div>
              <div className={`mt-1 font-semibold ${d.totalRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Total Revenue: {d.totalRevenue.toFixed(2)} ₼
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Daily Line Graph Component
  const renderDailyGraph = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Check if there's any data
    const hasData = dailyData.some(d => d.cost > 0 || d.revenue > 0);
    
    if (!hasData) {
      return (
        <div className="text-center text-gray-500 py-8">
          No data available for {monthNames[dailyMonth - 1]} {dailyYear} (excluding Salary and Kredit)
        </div>
      );
    }

    // Calculate max and min values for scaling
    const allValues = dailyData.flatMap(d => [d.cost, d.revenue, d.netRevenue]);
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);
    const valueRange = maxValue - minValue || 1;
    
    const graphHeight = 300;
    const graphWidth = Math.max(600, dailyData.length * 25);
    const padding = 50;
    const chartHeight = graphHeight - padding * 2;
    const chartWidth = graphWidth - padding * 2;

    // Helper function to calculate Y position (handles negative values)
    const getYPosition = (value) => {
      const normalizedValue = (value - minValue) / valueRange;
      return padding + chartHeight - (normalizedValue * chartHeight);
    };

    // Calculate points for lines
    const costPoints = dailyData.map((d, i) => {
      const x = padding + (i / (dailyData.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.cost);
      return { x, y };
    });

    const revenuePoints = dailyData.map((d, i) => {
      const x = padding + (i / (dailyData.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.revenue);
      return { x, y };
    });

    const netRevenuePoints = dailyData.map((d, i) => {
      const x = padding + (i / (dailyData.length - 1 || 1)) * chartWidth;
      const y = getYPosition(d.netRevenue);
      return { x, y };
    });

    // Create path strings
    const costPath = costPoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const revenuePath = revenuePoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const netRevenuePath = netRevenuePoints.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const handlePointHover = (dayIndex, event) => {
      setHoveredDay(dayIndex);
      setMousePosition({
        x: event.clientX,
        y: event.clientY
      });
    };

    const handlePointLeave = () => {
      setHoveredDay(null);
    };

    return (
      <div className="w-full relative">
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-600"></div>
              <span className="text-sm text-gray-700">Spending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-yellow-500"></div>
              <span className="text-sm text-gray-700">Money Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span className="text-sm text-gray-700">Net Revenue</span>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mb-4">
          Note: Salary and Kredit transactions are excluded from this view
        </p>
        <div className="overflow-x-auto relative">
          <svg 
            viewBox={`0 0 ${graphWidth} ${graphHeight}`} 
            className="w-full h-80"
            preserveAspectRatio="none"
            onMouseLeave={handlePointLeave}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + chartHeight - (ratio * chartHeight);
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}

            {/* Cost line */}
            <path
              d={costPath}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Revenue line (Money Added) - Yellow */}
            <path
              d={revenuePath}
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Net Revenue line - Blue */}
            <path
              d={netRevenuePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Zero line (for reference when net revenue is negative) */}
            {minValue < 0 && (
              <line
                x1={padding}
                y1={getYPosition(0)}
                x2={padding + chartWidth}
                y2={getYPosition(0)}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* Cost points */}
            {costPoints.map((point, i) => (
              <circle
                key={`cost-${i}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#dc2626"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* Revenue points (Money Added) - Yellow */}
            {revenuePoints.map((point, i) => (
              <circle
                key={`revenue-${i}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#eab308"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* Net Revenue points - Blue */}
            {netRevenuePoints.map((point, i) => (
              <circle
                key={`netRevenue-${i}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#2563eb"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(i, e)}
                onMouseMove={(e) => handlePointHover(i, e)}
              />
            ))}

            {/* X-axis labels (show every 5th day to avoid crowding) */}
            {dailyData.map((d, i) => {
              if (i % 5 === 0 || i === dailyData.length - 1) {
                const x = padding + (i / (dailyData.length - 1 || 1)) * chartWidth;
                return (
                  <text
                    key={i}
                    x={x}
                    y={graphHeight - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {d.day}
                  </text>
                );
              }
              return null;
            })}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = minValue + (valueRange * ratio);
              const y = getYPosition(value);
              return (
                <text
                  key={ratio}
                  x={padding - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {value.toFixed(0)}
                </text>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredDay !== null && dailyData[hoveredDay] && (
            <div
              className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 pointer-events-none"
              style={{
                left: `${mousePosition.x + 15}px`,
                top: `${mousePosition.y - 10}px`,
                transform: 'translateY(-50%)',
                minWidth: '180px',
                maxWidth: '220px'
              }}
            >
              <div className="font-semibold text-gray-900 mb-2 border-b pb-2">
                Day {dailyData[hoveredDay].day}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Spending:</span>
                  <span className="text-red-600 font-semibold">{dailyData[hoveredDay].cost.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Money Added:</span>
                  <span className="text-yellow-600 font-semibold">{dailyData[hoveredDay].revenue.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Revenue:</span>
                  <span className={`font-semibold ${dailyData[hoveredDay].netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dailyData[hoveredDay].netRevenue.toFixed(2)} ₼
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render graph function
  const renderGraph = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    return (
      <div className="w-full">
        {/* Graph Type Toggle */}
        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={() => setGraphType("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              graphType === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGraphType("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              graphType === "daily"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Daily
          </button>
        </div>

        {/* Daily Graph Selectors */}
        {graphType === "daily" && (
          <div className="flex gap-4 mb-4 justify-center items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Year:</label>
              <select
                value={dailyYear}
                onChange={(e) => setDailyYear(Number(e.target.value))}
                className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select
                value={dailyMonth}
                onChange={(e) => setDailyMonth(Number(e.target.value))}
                className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              >
                {monthNames.map((month, i) => (
                  <option key={i + 1} value={i + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Render appropriate graph */}
        {graphType === "monthly" ? renderMonthlyGraph(activeMonthlyData) : renderDailyGraph()}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5 flex flex-col h-[70rem]">

      {/* Transaction Type Tabs (Current/Scheduled) */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={() => {
            setTransactionTab("current");
            setViewMode("list"); // Reset to list view when switching tabs
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            transactionTab === "current"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Current ({currentTransactions.length})
        </button>
        <button
          onClick={() => {
            setTransactionTab("scheduled");
            setViewMode("list"); // Reset to list view when switching tabs
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            transactionTab === "scheduled"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Scheduled ({scheduledTransactions.length})
        </button>
      </div>

      {/* View Mode Tabs - Show for both current and scheduled tabs */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            viewMode === "list"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setViewMode("graph")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            viewMode === "graph"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          Graph
        </button>
      </div>

      {/* Filter Buttons - Only show in list view and for current transactions */}
      {viewMode === "list" && transactionTab === "current" && (
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setFilter("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === "daily"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setFilter("weekly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === "weekly"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === "monthly"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            All
          </button>
        </div>
      )}

      {/* Total Revenue - Only show for current transactions */}
      {transactionTab === "current" && (
        <div className={`text-gray-800 font-semibold mb-5 text-base flex-shrink-0 ${
          totalRevenue >= 0 ? "text-green-600" : "text-red-600"
        }`}>
          Total Revenue: {formattedRevenue} ₼
        </div>
      )}

      {/* Monthly Filter for Scheduled Tab */}
      {transactionTab === "scheduled" && scheduledMonths.length > 0 && (
        <div className="mb-4 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-sm"
          >
            <option value="all">All Months</option>
            {scheduledMonths.map(monthKey => {
              const [year, month] = monthKey.split('-');
              const date = new Date(year, parseInt(month) - 1);
              const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + year;
              return (
                <option key={monthKey} value={monthKey}>{monthLabel}</option>
              );
            })}
          </select>
        </div>
      )}

      {/* Scheduled Transactions Info and Expected Revenue */}
      {transactionTab === "scheduled" && (
        <div className="mb-5 flex-shrink-0 space-y-3">
          {/* Info Box */}
          <div className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="font-medium text-blue-900 mb-1">Scheduled Transactions</div>
            <div className="text-blue-700 text-xs">
              These transactions will be processed automatically when their scheduled date arrives. They do not affect your current balance or limits. Uncheck transactions to exclude them from expected revenue calculations.
            </div>
          </div>
          
          {/* Expected Revenue Summary */}
          {scheduledTransactions.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="font-semibold text-gray-900 mb-3 text-base">Expected Revenue</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expected Revenue:</span>
                  <span className="font-semibold text-green-600 text-base">
                    +{expectedRevenue.revenue.toFixed(2).replace(".", ",")} ₼
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expected Spending:</span>
                  <span className="font-semibold text-red-600 text-base">
                    -{expectedRevenue.cost.toFixed(2).replace(".", ",")} ₼
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net Expected Revenue:</span>
                    <span className={`font-bold text-base ${
                      expectedRevenue.net >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {expectedRevenue.net >= 0 ? "+" : ""}
                      {expectedRevenue.net.toFixed(2).replace(".", ",")} ₼
                    </span>
                  </div>
                </div>
                {currentCard && projectedBalance !== null && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Balance:</span>
                      <span className="font-medium text-gray-700 text-base">
                        {Number(currentCard.amount || 0).toFixed(2).replace(".", ",")} ₼
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-gray-900">Projected Balance:</span>
                      <span className={`font-bold text-lg ${
                        projectedBalance >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {projectedBalance.toFixed(2).replace(".", ",")} ₼
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-y-auto flex-1 min-h-0">
        {viewMode === "graph" ? (
          renderGraph()
        ) : (
          filteredTransactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No transactions found</div>
          ) : (
            filteredTransactions.map(tx => {
              const time = formatTime(tx.date);
              const category = tx.category || "Other";
              const formattedAmount = Number(tx.amount).toFixed(2).replace(".", ",");
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-0 hover:bg-gray-100 transition-colors group"
                >
                  {/* Checkbox for scheduled transactions */}
                  {transactionTab === "scheduled" && onToggleIncludeInExpected && (
                    <input
                      type="checkbox"
                      checked={tx.includeInExpected !== false}
                      onChange={() => onToggleIncludeInExpected(tx.id, tx.includeInExpected !== false ? false : true)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      title={tx.includeInExpected !== false ? "Included in expected revenue" : "Excluded from expected revenue"}
                    />
                  )}

                  {/* Icon */}
                  {getTransactionIcon(category, tx.type)}

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-base truncate">{tx.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {transactionTab === "scheduled" ? (
                        <>
                          Scheduled: {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {time} · {category}
                          {tx.includeInExpected === false && (
                            <span className="ml-2 text-orange-600 font-medium">(Excluded from expected revenue)</span>
                          )}
                        </>
                      ) : (
                        <>
                          {formatDateWithTime(tx.date)} · {category}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div
                    className={`font-semibold text-base whitespace-nowrap ${
                      tx.type === "cost" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {tx.type === "cost" ? "-" : "+"}
                    {formattedAmount} ₼
                  </div>

                  {/* Delete Button */}
                  {onDeleteTransaction && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete transaction "${tx.title}"?`)) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Transaction"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

    </div>
  );
}
