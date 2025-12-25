import { useState, useEffect } from "react";
import { db } from "../firebase/client";
import { doc, updateDoc } from "firebase/firestore";

export default function CardPlanModal({ card, onClose, onUpdate }) {
  const [plans, setPlans] = useState([]);
  const [newPlanMonth, setNewPlanMonth] = useState("");
  const [newPlanAmount, setNewPlanAmount] = useState("");
  const [editingMonth, setEditingMonth] = useState(null); // Track which plan is being edited

  useEffect(() => {
    if (card && card.plans) {
      setPlans(card.plans);
    }
  }, [card]);

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
  };

  const handleEditPlan = (plan) => {
    // If already editing this plan, do nothing
    if (editingMonth === plan.month) return;
    
    // Switch to editing this plan
    setNewPlanMonth(plan.month);
    setNewPlanAmount(plan.amount.toString());
    setEditingMonth(plan.month);
  };

  const handleCancelEdit = () => {
    setNewPlanMonth("");
    setNewPlanAmount("");
    setEditingMonth(null);
  };

  const handleAddPlan = () => {
    if (newPlanMonth && newPlanAmount) {
      const planExists = plans.find(p => p.month === newPlanMonth);
      if (planExists && editingMonth === newPlanMonth) {
        // Update existing plan (editing mode)
        const updated = plans.map(p => 
          p.month === newPlanMonth 
            ? { ...p, amount: Number(newPlanAmount) }
            : p
        );
        setPlans(updated);
      } else if (planExists && editingMonth !== newPlanMonth) {
        // User is trying to add a plan for a month that already exists
        alert(`A plan already exists for ${formatMonthLabel(newPlanMonth)}. Please edit the existing plan instead.`);
        return;
      } else {
        // Add new plan
        setPlans([...plans, { month: newPlanMonth, amount: Number(newPlanAmount) }]);
      }
      handleCancelEdit();
    }
  };

  const handleDeletePlan = (month) => {
    setPlans(plans.filter(p => p.month !== month));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "cards", card.id), { plans });
      onUpdate({ ...card, plans });
      onClose();
    } catch (err) {
      console.error("Failed to update plans", err);
      alert("Failed to save plans. Please try again.");
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
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Monthly Balance Plans</h2>

        {/* Add/Edit Plan */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {editingMonth ? `Edit Plan for ${formatMonthLabel(editingMonth)}` : "Add New Plan"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <input
                type="month"
                value={newPlanMonth}
                onChange={(e) => setNewPlanMonth(e.target.value)}
                disabled={editingMonth !== null} // Disable month selection when editing
                className={`border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  editingMonth !== null ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Balance (₼)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={newPlanAmount}
                onChange={(e) => setNewPlanAmount(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                onClick={handleAddPlan}
                disabled={!newPlanMonth || !newPlanAmount}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  newPlanMonth && newPlanAmount
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {editingMonth ? "Update Plan" : "Add Plan"}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Plans */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Plans</h3>
          {plans.length === 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">No plans set</div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{formatMonthLabel(plan.month)}</div>
                    <div className="text-sm text-gray-500">Minimum Balance: {plan.amount.toFixed(2)} ₼</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingMonth === plan.month
                          ? "text-blue-700 bg-blue-100 cursor-pointer"
                          : "text-blue-600 hover:bg-blue-50 cursor-pointer"
                      }`}
                      title={editingMonth === plan.month ? "Currently editing" : "Edit Plan"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 011.415 3.621L12 15l-4 1 1-4 8.879-7.879a2.121 2.121 0 011.415-.621z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (editingMonth === plan.month) {
                          handleCancelEdit();
                        }
                        handleDeletePlan(plan.month);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Plan"
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
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex-1 cursor-pointer"
          >
            Save Plans
          </button>
        </div>
      </div>
    </div>
  );
}

