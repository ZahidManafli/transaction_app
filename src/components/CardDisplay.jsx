export default function CardDisplay({ card, onManageLimits, onManagePlans, transactions = [] }) {
  // Extract last 4 digits
  const lastFourDigits = card.cardNumber.replace(/\s/g, "").slice(-4);
  const formattedBalance = Number(card.amount).toFixed(2).replace(".", ",");

  // Get current month limit and spending (exclude scheduled transactions)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentLimit = card.limits?.find(l => l.month === currentMonthKey);
  const currentPlan = card.plans?.find(p => p.month === currentMonthKey);
  
  const currentMonthSpending = transactions
    .filter(t => {
      if (t.type !== "cost") return false;
      // Exclude transactions that don't affect balance
      if (!t.isAffect) return false;
      const tDate = new Date(t.date);
      const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      return tMonthKey === currentMonthKey;
    })
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate current balance
  const currentBalance = Number(card.amount) || 0;

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
  };

  return (
    <div className="flex flex-col items-start mb-6">
      {/* CARD */}
      <div className="relative w-full max-w-sm">
        <div
          className="w-full h-48 rounded-2xl shadow-md p-6 relative overflow-hidden"
          style={{ backgroundColor: "#2d2d2d" }}
        >
          {/* RED PARALLELOGRAM IN CENTER */}
          <div 
            className="absolute inset-0 mt-3 flex items-center justify-center"
            style={{
              transform: "skewX(-15deg)",
            }}
          >
            <div 
              className="w-3/4 h-24"
              style={{ backgroundColor: "#dc2626" }}
            />
          </div>

          {/* TOP LEFT - LAST 4 DIGITS */}
          <div className="relative z-10 text-lg font-semibold text-white mb-auto">
          · {lastFourDigits}
          </div>

          {/* TOP RIGHT - VISA LOGO */}
          <div className="absolute top-4 right-4 z-10">
            <div className="text-white text-sm font-bold tracking-wider" style={{ letterSpacing: '2px' }}>VISA</div>
          </div>
        </div>
      </div>

      {/* CARD DETAILS LINK */}
      <div className="mt-3 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
        Card details...
      </div>

      {/* BALANCE */}
      <div className="text-5xl font-bold mt-4 text-gray-900">
        {formattedBalance} ₼
      </div>

      {/* Current Month Limit Status */}
      {currentLimit && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg w-full">
          <div className="text-sm font-medium text-gray-700 mb-1">
            {formatMonthLabel(currentMonthKey)} Limit
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Spent:</span>
            <span className={`text-sm font-semibold ${
              currentMonthSpending >= currentLimit.amount 
                ? "text-red-600" 
                : currentMonthSpending >= currentLimit.amount * 0.8
                ? "text-yellow-600"
                : "text-green-600"
            }`}>
              {currentMonthSpending.toFixed(2)} / {currentLimit.amount.toFixed(2)} ₼
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                currentMonthSpending >= currentLimit.amount
                  ? "bg-red-600"
                  : currentMonthSpending >= currentLimit.amount * 0.8
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min((currentMonthSpending / currentLimit.amount) * 100, 100)}%`
              }}
            />
          </div>
          {currentMonthSpending >= currentLimit.amount && (
            <div className="text-xs text-red-600 mt-1 font-medium">
              Limit exceeded!
            </div>
          )}
        </div>
      )}

      {/* Current Month Plan Status */}
      {currentPlan && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg w-full border border-blue-200">
          <div className="text-sm font-medium text-gray-700 mb-1">
            {formatMonthLabel(currentMonthKey)} Plan
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Current Balance:</span>
            <span className={`text-sm font-semibold ${
              currentBalance < currentPlan.amount 
                ? "text-red-600" 
                : currentBalance < currentPlan.amount * 1.1
                ? "text-yellow-600"
                : "text-green-600"
            }`}>
              {currentBalance.toFixed(2)} / {currentPlan.amount.toFixed(2)} ₼
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                currentBalance < currentPlan.amount
                  ? "bg-red-600"
                  : currentBalance < currentPlan.amount * 1.1
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min((currentBalance / currentPlan.amount) * 100, 100)}%`
              }}
            />
          </div>
          {currentBalance < currentPlan.amount && (
            <div className="text-xs text-red-600 mt-1 font-medium">
              Below plan minimum!
            </div>
          )}
        </div>
      )}

      {/* Manage Buttons */}
      <div className="mt-4 flex gap-2 w-full">
        {onManageLimits && (
          <button
            onClick={onManageLimits}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer text-sm"
          >
            Manage Spending Limits
          </button>
        )}
        {onManagePlans && (
          <button
            onClick={onManagePlans}
            className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors cursor-pointer text-sm"
          >
            Manage Plans
          </button>
        )}
      </div>
    </div>
  );
}
