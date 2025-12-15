export default function ActionButtons({ onAddCard, onAddTransaction }) {
  return (
    <div className="flex gap-4 mt-8 mb-6">
      {/* Add Transaction Button */}
      <button
        onClick={onAddTransaction}
        className="px-8 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md cursor-pointer"
      >
        Add Transaction
      </button>

      {/* Add Card Button */}
      <button
        onClick={onAddCard}
        className="px-8 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md cursor-pointer"
      >
        Add Card
      </button>
    </div>
  );
}
