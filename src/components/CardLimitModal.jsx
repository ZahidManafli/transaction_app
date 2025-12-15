import { useState, useEffect } from "react";
import { db } from "../firebase/client";
import { doc, updateDoc } from "firebase/firestore";

export default function CardLimitModal({ card, onClose, onUpdate }) {
  const [limits, setLimits] = useState([]);
  const [newLimitMonth, setNewLimitMonth] = useState("");
  const [newLimitAmount, setNewLimitAmount] = useState("");
  const [editingMonth, setEditingMonth] = useState(null); // Track which limit is being edited

  useEffect(() => {
    if (card && card.limits) {
      setLimits(card.limits);
    }
  }, [card]);

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
  };

  const handleEditLimit = (limit) => {
    // If already editing this limit, do nothing
    if (editingMonth === limit.month) return;
    
    // Switch to editing this limit
    setNewLimitMonth(limit.month);
    setNewLimitAmount(limit.amount.toString());
    setEditingMonth(limit.month);
  };

  const handleCancelEdit = () => {
    setNewLimitMonth("");
    setNewLimitAmount("");
    setEditingMonth(null);
  };

  const handleAddLimit = () => {
    if (newLimitMonth && newLimitAmount) {
      const limitExists = limits.find(l => l.month === newLimitMonth);
      if (limitExists && editingMonth === newLimitMonth) {
        // Update existing limit (editing mode)
        const updated = limits.map(l => 
          l.month === newLimitMonth 
            ? { ...l, amount: Number(newLimitAmount) }
            : l
        );
        setLimits(updated);
      } else if (limitExists && editingMonth !== newLimitMonth) {
        // User is trying to add a limit for a month that already exists
        alert(`A limit already exists for ${formatMonthLabel(newLimitMonth)}. Please edit the existing limit instead.`);
        return;
      } else {
        // Add new limit
        setLimits([...limits, { month: newLimitMonth, amount: Number(newLimitAmount) }]);
      }
      handleCancelEdit();
    }
  };

  const handleDeleteLimit = (month) => {
    setLimits(limits.filter(l => l.month !== month));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "cards", card.id), { limits });
      onUpdate({ ...card, limits });
      onClose();
    } catch (err) {
      console.error("Failed to update limits", err);
      alert("Failed to save limits. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center">
      {/* Backdrop div */}
      <div 
        className="absolute w-full h-full bg-gray-500"
        style={{ opacity: 0.5 }}
        onClick={onClose}
      />
      {/* Modal content */}
      <div className="relative bg-white p-6 rounded-xl w-96 shadow-xl max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Monthly Spending Limits</h2>

        {/* Add/Edit Limit */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {editingMonth ? `Edit Limit for ${formatMonthLabel(editingMonth)}` : "Add New Limit"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <input
                type="month"
                value={newLimitMonth}
                onChange={(e) => setNewLimitMonth(e.target.value)}
                disabled={editingMonth !== null} // Disable month selection when editing
                className={`border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  editingMonth !== null ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit Amount (₼)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="50.00"
                value={newLimitAmount}
                onChange={(e) => setNewLimitAmount(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex gap-2">
              {editingMonth && (
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleAddLimit}
                disabled={!newLimitMonth || !newLimitAmount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  newLimitMonth && newLimitAmount
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {editingMonth ? "Update Limit" : "Add Limit"}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Limits */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Limits</h3>
          {limits.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">No limits set</div>
          ) : (
            <div className="space-y-2">
              {limits.map((limit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{formatMonthLabel(limit.month)}</div>
                    <div className="text-sm text-gray-500">Limit: {limit.amount.toFixed(2)} ₼</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditLimit(limit)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingMonth === limit.month
                          ? "text-blue-700 bg-blue-100 cursor-pointer"
                          : "text-blue-600 hover:bg-blue-50 cursor-pointer"
                      }`}
                      title={editingMonth === limit.month ? "Currently editing" : "Edit Limit"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 011.415 3.621L12 15l-4 1 1-4 8.879-7.879a2.121 2.121 0 011.415-.621z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (editingMonth === limit.month) {
                          handleCancelEdit();
                        }
                        handleDeleteLimit(limit.month);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Limit"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-3">
          <button 
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex-1 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex-1 cursor-pointer"
          >
            Save Limits
          </button>
        </div>
      </div>
    </div>
  );
}

