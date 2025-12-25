import { useState, useEffect } from "react";
import { db } from "../firebase/client";
import { doc, updateDoc } from "firebase/firestore";

export default function CardWishModal({ card, onClose, onUpdate }) {
  const [wishes, setWishes] = useState([]);
  const [newWishMonth, setNewWishMonth] = useState("");
  const [newWishAmount, setNewWishAmount] = useState("");
  const [editingMonth, setEditingMonth] = useState(null); // Track which wish is being edited

  useEffect(() => {
    if (card && card.wishes) {
      setWishes(card.wishes);
    }
  }, [card]);

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
  };

  const handleEditWish = (wish) => {
    // If already editing this wish, do nothing
    if (editingMonth === wish.month) return;
    
    // Switch to editing this wish
    setNewWishMonth(wish.month);
    setNewWishAmount(wish.targetAmount.toString());
    setEditingMonth(wish.month);
  };

  const handleCancelEdit = () => {
    setNewWishMonth("");
    setNewWishAmount("");
    setEditingMonth(null);
  };

  const handleAddWish = () => {
    if (newWishMonth && newWishAmount) {
      const wishExists = wishes.find(w => w.month === newWishMonth);
      if (wishExists && editingMonth === newWishMonth) {
        // Update existing wish (editing mode)
        const updated = wishes.map(w => 
          w.month === newWishMonth 
            ? { ...w, targetAmount: Number(newWishAmount) }
            : w
        );
        setWishes(updated);
      } else if (wishExists && editingMonth !== newWishMonth) {
        // User is trying to add a wish for a month that already exists
        alert(`A wish already exists for ${formatMonthLabel(newWishMonth)}. Please edit the existing wish instead.`);
        return;
      } else {
        // Add new wish
        setWishes([...wishes, { month: newWishMonth, targetAmount: Number(newWishAmount) }]);
      }
      handleCancelEdit();
    }
  };

  const handleDeleteWish = (month) => {
    setWishes(wishes.filter(w => w.month !== month));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "cards", card.id), { wishes });
      onUpdate({ ...card, wishes });
      onClose();
    } catch (err) {
      console.error("Failed to update wishes", err);
      alert("Failed to save wishes. Please try again.");
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
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Savings Wishes</h2>

        {/* Add/Edit Wish */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {editingMonth ? `Edit Wish for ${formatMonthLabel(editingMonth)}` : "Add New Wish"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Month
              </label>
              <input
                type="month"
                value={newWishMonth}
                onChange={(e) => setNewWishMonth(e.target.value)}
                disabled={editingMonth !== null} // Disable month selection when editing
                className={`border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  editingMonth !== null ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Amount (₼)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="3000.00"
                value={newWishAmount}
                onChange={(e) => setNewWishAmount(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                The amount you want to accumulate by this month
              </p>
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
                onClick={handleAddWish}
                disabled={!newWishMonth || !newWishAmount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  newWishMonth && newWishAmount
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {editingMonth ? "Update Wish" : "Add Wish"}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Wishes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Wishes</h3>
          {wishes.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">No wishes set</div>
          ) : (
            <div className="space-y-2">
              {wishes.map((wish, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{formatMonthLabel(wish.month)}</div>
                    <div className="text-sm text-gray-500">Target: {wish.targetAmount.toFixed(2)} ₼</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditWish(wish)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingMonth === wish.month
                          ? "text-purple-700 bg-purple-100 cursor-pointer"
                          : "text-purple-600 hover:bg-purple-50 cursor-pointer"
                      }`}
                      title={editingMonth === wish.month ? "Currently editing" : "Edit Wish"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 011.415 3.621L12 15l-4 1 1-4 8.879-7.879a2.121 2.121 0 011.415-.621z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (editingMonth === wish.month) {
                          handleCancelEdit();
                        }
                        handleDeleteWish(wish.month);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Wish"
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
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex-1 cursor-pointer"
          >
            Save Wishes
          </button>
        </div>
      </div>
    </div>
  );
}

