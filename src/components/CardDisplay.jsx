import { useMemo } from "react";

export default function CardDisplay({ card, onManageLimits, onManagePlans, onManageWishes, transactions = [] }) {
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
  
  // Get active wishes (future months or current month)
  const activeWishes = useMemo(() => {
    if (!card.wishes || card.wishes.length === 0) return [];
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return card.wishes
      .filter(wish => {
        const [year, month] = wish.month.split('-').map(Number);
        const wishMonthDate = new Date(year, month - 1, 1);
        // Include wishes for current month or future months
        return wishMonthDate >= currentMonthDate;
      })
      .sort((a, b) => {
        const [yearA, monthA] = a.month.split('-').map(Number);
        const [yearB, monthB] = b.month.split('-').map(Number);
        const dateA = new Date(yearA, monthA - 1, 1);
        const dateB = new Date(yearB, monthB - 1, 1);
        return dateA - dateB;
      });
  }, [card.wishes]);

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

      {/* Active Wishes */}
      {activeWishes.length > 0 && (
        <div className="mt-4 w-full space-y-3">
          {activeWishes.map((wish, index) => {
            const progress = Math.min((currentBalance / wish.targetAmount) * 100, 100);
            const remaining = Math.max(wish.targetAmount - currentBalance, 0);
            const isAchieved = currentBalance >= wish.targetAmount;
            
            return (
              <div key={index} className="p-3 bg-purple-50 rounded-lg w-full border border-purple-200">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Wish: {formatMonthLabel(wish.month)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Progress:</span>
                  <span className={`text-sm font-semibold ${
                    isAchieved
                      ? "text-green-600"
                      : progress >= 80
                      ? "text-yellow-600"
                      : "text-purple-600"
                  }`}>
                    {currentBalance.toFixed(2)} / {wish.targetAmount.toFixed(2)} ₼
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isAchieved
                        ? "bg-green-500"
                        : progress >= 80
                        ? "bg-yellow-500"
                        : "bg-purple-500"
                    }`}
                    style={{
                      width: `${progress}%`
                    }}
                  />
                </div>
                {isAchieved ? (
                  <div className="text-xs text-green-600 font-medium">
                    🎉 Wish achieved!
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    {remaining.toFixed(2)} ₼ remaining to reach your wish
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manage Buttons */}
      <div className="mt-4 flex flex-col gap-2 w-full">
        <div className="flex gap-2">
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
        {onManageWishes && (
          <button
            onClick={onManageWishes}
            className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors cursor-pointer text-sm"
          >
            Manage Wishes
          </button>
        )}
      </div>
    </div>
  );
}
