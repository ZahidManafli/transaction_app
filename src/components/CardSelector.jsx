export default function CardSelector({ cards, selected, onSelect, onDelete }) {
  if (cards.length === 0) return null;
  
  const selectedCard = cards.find(c => c.id === selected);
  
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete card ${selectedCard?.cardNumber}? This will also delete all its transactions.`)) {
      onDelete(selected);
    }
  };
  
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={selected || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="appearance-none border border-gray-300 rounded-lg px-4 py-2.5 bg-white shadow-sm pr-10 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer w-full max-w-xs"
        >
          {cards.map(card => (
            <option key={card.id} value={card.id}>
              {card.cardNumber}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      {selectedCard && (
        <button
          onClick={handleDelete}
          disabled={cards.length === 1}
          className={`p-2 rounded-lg transition-colors ${
            cards.length === 1
              ? "text-gray-400 cursor-not-allowed"
              : "text-red-600 hover:bg-red-50 cursor-pointer"
          }`}
          title={cards.length === 1 ? "Cannot delete the last card" : "Delete Card"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      )}
    </div>
  );
}
