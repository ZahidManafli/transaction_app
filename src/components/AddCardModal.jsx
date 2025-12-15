import { useState } from "react";

export default function AddCardModal({ onClose, onSubmit }) {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");

  const handleNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
    if (value.length <= 16) {
      // Format with spaces every 4 digits
      const formatted = value.replace(/(.{4})/g, "$1 ").trim();
      setNumber(formatted);
    }
  };

  const handleSubmit = () => {
    const cardNumberOnly = number.replace(/\s/g, "");
    if (cardNumberOnly.length === 16 && amount) {
      onSubmit({ 
        cardNumber: number, 
        amount: Number(amount),
        limits: [] // Initialize with empty limits array
      });
      setNumber("");
      setAmount("");
      onClose();
    }
  };

  const cardNumberOnly = number.replace(/\s/g, "");
  const isValid = cardNumberOnly.length === 16 && amount;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center">
      {/* Backdrop div */}
      <div 
        className="absolute w-full h-full bg-gray-500"
        style={{ opacity: 0.5 }}
        onClick={onClose}
      />
      {/* Modal content */}
      <div className="relative bg-white p-6 rounded-xl w-80 shadow-xl max-w-[90vw]">

        <h2 className="text-xl font-semibold mb-6 text-gray-900">Add New Card</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number (16 digits)
          </label>
          <input
            type="text"
            maxLength={19}
            placeholder="1234 5678 9012 3456"
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={number}
            onChange={handleNumberChange}
          />
          {cardNumberOnly.length > 0 && cardNumberOnly.length < 16 && (
            <p className="text-xs text-red-500 mt-1">{16 - cardNumberOnly.length} digits remaining</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Existing Balance
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex justify-between gap-3">
          <button 
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex-1 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className={`px-6 py-2.5 text-white rounded-lg font-medium transition-colors flex-1 ${
              isValid 
                ? "bg-red-600 hover:bg-red-700 cursor-pointer" 
                : "bg-gray-400 cursor-not-allowed"
            }`}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Add Card
          </button>
        </div>

      </div>
    </div>
  );
}
