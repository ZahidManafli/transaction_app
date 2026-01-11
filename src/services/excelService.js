import * as XLSX from 'xlsx';

/**
 * Export all financial data to Excel file
 * @param {Array} cards - Array of card objects with limits, plans, wishes
 * @param {Array} transactions - Array of transaction objects
 */
export const exportToExcel = (cards, transactions) => {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // 1. Cards sheet
  const cardsData = cards.map(card => ({
    card_number: card.number || card.card_number || '',
    current_amount: card.amount ?? card.current_amount ?? 0
  }));
  const cardsSheet = XLSX.utils.json_to_sheet(cardsData);
  XLSX.utils.book_append_sheet(workbook, cardsSheet, 'Cards');

  // 2. Transactions sheet
  const transactionsData = transactions.map(tx => {
    // Find card number by cardId
    const card = cards.find(c => c.id === tx.cardId);
    return {
      card_number: card?.number || card?.card_number || tx.cardId,
      title: tx.title || '',
      type: tx.type || '',
      category: tx.category || '',
      amount: tx.amount || 0,
      date: tx.date || '',
      scheduled: tx.scheduled ? 'Yes' : 'No',
      isAffect: tx.isAffect ? 'Yes' : 'No',
      includeInExpected: tx.includeInExpected !== false ? 'Yes' : 'No'
    };
  });
  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  // 3. Limits sheet
  const limitsData = [];
  cards.forEach(card => {
    if (card.limits && card.limits.length > 0) {
      card.limits.forEach(limit => {
        limitsData.push({
          card_number: card.number || card.card_number || '',
          month: limit.month || '',
          amount: limit.amount || 0
        });
      });
    }
  });
  const limitsSheet = XLSX.utils.json_to_sheet(limitsData.length > 0 ? limitsData : [{ card_number: '', month: '', amount: '' }]);
  XLSX.utils.book_append_sheet(workbook, limitsSheet, 'Limits');

  // 4. Plans sheet
  const plansData = [];
  cards.forEach(card => {
    if (card.plans && card.plans.length > 0) {
      card.plans.forEach(plan => {
        plansData.push({
          card_number: card.number || card.card_number || '',
          month: plan.month || '',
          amount: plan.amount || 0
        });
      });
    }
  });
  const plansSheet = XLSX.utils.json_to_sheet(plansData.length > 0 ? plansData : [{ card_number: '', month: '', amount: '' }]);
  XLSX.utils.book_append_sheet(workbook, plansSheet, 'Plans');

  // 5. Wishes sheet
  const wishesData = [];
  cards.forEach(card => {
    if (card.wishes && card.wishes.length > 0) {
      card.wishes.forEach(wish => {
        wishesData.push({
          card_number: card.number || card.card_number || '',
          month: wish.month || '',
          amount: wish.amount || 0
        });
      });
    }
  });
  const wishesSheet = XLSX.utils.json_to_sheet(wishesData.length > 0 ? wishesData : [{ card_number: '', month: '', amount: '' }]);
  XLSX.utils.book_append_sheet(workbook, wishesSheet, 'Wishes');

  // Generate file and trigger download
  const fileName = `financial_data_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Parse Excel file and return structured data
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Object>} Parsed data object with cards, transactions, limits, plans, wishes
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result = {
          cards: [],
          transactions: [],
          limits: [],
          plans: [],
          wishes: []
        };

        // Parse Cards sheet
        if (workbook.SheetNames.includes('Cards')) {
          const sheet = workbook.Sheets['Cards'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          result.cards = jsonData.map(row => ({
            card_number: String(row.card_number || '').trim(),
            current_amount: Number(row.current_amount) || 0
          })).filter(c => c.card_number);
        }

        // Parse Transactions sheet
        if (workbook.SheetNames.includes('Transactions')) {
          const sheet = workbook.Sheets['Transactions'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          result.transactions = jsonData.map(row => ({
            card_number: String(row.card_number || '').trim(),
            title: String(row.title || '').trim(),
            type: String(row.type || '').trim().toLowerCase(),
            category: String(row.category || '').trim(),
            amount: Number(row.amount) || 0,
            date: row.date || new Date().toISOString(),
            scheduled: String(row.scheduled || '').toLowerCase() === 'yes',
            isAffect: String(row.isAffect || '').toLowerCase() === 'yes',
            includeInExpected: String(row.includeInExpected || 'yes').toLowerCase() !== 'no'
          })).filter(tx => tx.title && tx.amount > 0);
        }

        // Parse Limits sheet
        if (workbook.SheetNames.includes('Limits')) {
          const sheet = workbook.Sheets['Limits'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          result.limits = jsonData.map(row => ({
            card_number: String(row.card_number || '').trim(),
            month: String(row.month || '').trim(),
            amount: Number(row.amount) || 0
          })).filter(l => l.card_number && l.month && l.amount > 0);
        }

        // Parse Plans sheet
        if (workbook.SheetNames.includes('Plans')) {
          const sheet = workbook.Sheets['Plans'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          result.plans = jsonData.map(row => ({
            card_number: String(row.card_number || '').trim(),
            month: String(row.month || '').trim(),
            amount: Number(row.amount) || 0
          })).filter(p => p.card_number && p.month && p.amount > 0);
        }

        // Parse Wishes sheet
        if (workbook.SheetNames.includes('Wishes')) {
          const sheet = workbook.Sheets['Wishes'];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          result.wishes = jsonData.map(row => ({
            card_number: String(row.card_number || '').trim(),
            month: String(row.month || '').trim(),
            amount: Number(row.amount) || 0
          })).filter(w => w.card_number && w.month && w.amount > 0);
        }

        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate imported data before saving
 * @param {Object} data - Parsed data from parseExcelFile
 * @param {Array} existingCards - Current cards in the system
 * @returns {Object} Validation result with isValid and errors
 */
export const validateImportData = (data, existingCards = []) => {
  const errors = [];
  const warnings = [];

  // Validate cards
  if (data.cards && data.cards.length > 0) {
    data.cards.forEach((card, i) => {
      if (!card.card_number) {
        errors.push(`Cards row ${i + 1}: Missing card number`);
      }
      if (card.current_amount < 0) {
        warnings.push(`Cards row ${i + 1}: Negative balance (${card.current_amount})`);
      }
    });
  }

  // Validate transactions
  if (data.transactions && data.transactions.length > 0) {
    const validTypes = ['cost', 'revenue'];
    data.transactions.forEach((tx, i) => {
      if (!tx.card_number) {
        errors.push(`Transactions row ${i + 1}: Missing card number`);
      }
      if (!tx.title) {
        errors.push(`Transactions row ${i + 1}: Missing title`);
      }
      if (!validTypes.includes(tx.type)) {
        errors.push(`Transactions row ${i + 1}: Invalid type "${tx.type}" (must be "cost" or "revenue")`);
      }
      if (tx.amount <= 0) {
        errors.push(`Transactions row ${i + 1}: Amount must be greater than 0`);
      }
    });
  }

  // Validate limits, plans, wishes
  ['limits', 'plans', 'wishes'].forEach(type => {
    if (data[type] && data[type].length > 0) {
      data[type].forEach((item, i) => {
        if (!item.card_number) {
          errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} row ${i + 1}: Missing card number`);
        }
        if (!item.month || !/^\d{4}-\d{2}$/.test(item.month)) {
          errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} row ${i + 1}: Invalid month format (use YYYY-MM)`);
        }
        if (item.amount <= 0) {
          errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} row ${i + 1}: Amount must be greater than 0`);
        }
      });
    }
  });

  // Check if card numbers in transactions/limits/plans/wishes exist
  const allCardNumbers = new Set([
    ...data.cards.map(c => c.card_number),
    ...existingCards.map(c => c.number || c.card_number)
  ]);

  [...data.transactions, ...data.limits, ...data.plans, ...data.wishes].forEach((item, i) => {
    if (item.card_number && !allCardNumbers.has(item.card_number)) {
      warnings.push(`Card number "${item.card_number}" not found - will be skipped unless card is imported`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      cards: data.cards?.length || 0,
      transactions: data.transactions?.length || 0,
      limits: data.limits?.length || 0,
      plans: data.plans?.length || 0,
      wishes: data.wishes?.length || 0
    }
  };
};

/**
 * Generate a template Excel file for import
 */
export const downloadTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // Cards template
  const cardsTemplate = [
    { card_number: '1234-5678-9012-3456', current_amount: 1000 }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cardsTemplate), 'Cards');

  // Transactions template
  const transactionsTemplate = [
    { card_number: '1234-5678-9012-3456', title: 'Groceries', type: 'cost', category: 'Food', amount: 50, date: '2025-01-15', scheduled: 'No', isAffect: 'No', includeInExpected: 'Yes' }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionsTemplate), 'Transactions');

  // Limits template
  const limitsTemplate = [
    { card_number: '1234-5678-9012-3456', month: '2025-01', amount: 500 }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(limitsTemplate), 'Limits');

  // Plans template
  const plansTemplate = [
    { card_number: '1234-5678-9012-3456', month: '2025-01', amount: 1000 }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(plansTemplate), 'Plans');

  // Wishes template
  const wishesTemplate = [
    { card_number: '1234-5678-9012-3456', month: '2025-12', amount: 5000 }
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(wishesTemplate), 'Wishes');

  XLSX.writeFile(workbook, 'import_template.xlsx');
};

