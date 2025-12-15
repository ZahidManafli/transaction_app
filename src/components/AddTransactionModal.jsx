import { useState } from "react";

export default function AddTransactionModal({ onClose, onSubmit, cards, defaultCardId }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("cost");
  const [category, setCategory] = useState("Markets");
  const [cardId, setCardId] = useState(defaultCardId);
  
  // Get current date and time as default values
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const defaultTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  const handleSubmit = () => {
    if (title && amount && cardId && date && time) {
      // Combine date and time into ISO string
      // Parse date and time components
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create date object with local date/time
      const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      onSubmit({
        cardId,
        title,
        type,
        category,
        amount: Number(amount),
        date: dateTime.toISOString()
      });
      setTitle("");
      setAmount("");
      setType("cost");
      setCategory("Markets");
      setDate(defaultDate);
      setTime(defaultTime);
      onClose();
    }
  };

  const isValid = title && amount && cardId && date && time;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center overflow-y-auto">
      {/* Backdrop div */}
      <div 
        className="absolute w-full h-full bg-gray-500"
        style={{ opacity: 0.5 }}
        onClick={onClose}
      />
      {/* Modal content */}
      <div className="relative bg-white p-6 rounded-xl w-full max-w-2xl shadow-xl mx-4 my-auto">

        <h2 className="text-xl font-semibold mb-6 text-gray-900">Add Transaction</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card
              </label>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.cardNumber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title / Merchant Name
              </label>
              <input
                type="text"
                placeholder="e.g., ERZAQ MAGAZASI"
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="cost">Cost (Spending)</option>
                <option value="revenue">Revenue</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Markets">Markets</option>
                <option value="Transfers">Transfers</option>
                <option value="Parking">Parking</option>
                <option value="Salary">Salary</option>
                <option value="Kredit">Kredit</option>
                <option value="Enjoyment">Enjoyment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Buttons spanning full width */}
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
            Add Transaction
          </button>
        </div>

      </div>
    </div>
  );
}
