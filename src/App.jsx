import React, { useEffect, useState } from "react";

import CardSelector from "./components/CardSelector";
import CardDisplay from "./components/CardDisplay";
import ActionButtons from "./components/ActionButtons";
import TransactionList from "./components/TransactionList";
import AddCardModal from "./components/AddCardModal";
import AddTransactionModal from "./components/AddTransactionModal";
import CardLimitModal from "./components/CardLimitModal";
import CardPlanModal from "./components/CardPlanModal";
import CardWishModal from "./components/CardWishModal";
import AuthPanel from "./components/AuthPanel";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase/client";
import { addCardToTable } from "./firebase/cards";
import { addTransactionToTable } from "./firebase/transactions";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

export default function App() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showWishModal, setShowWishModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function to check if transaction is scheduled (future date)
  const isScheduled = (tx) => {
    const txDate = new Date(tx.date);
    const now = new Date();
    return txDate > now;
  };

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem("userId", user.uid);
      } else {
        localStorage.removeItem("userId");
        setCards([]);
        setTransactions([]);
        setSelectedCardId(null);
      }
    });
    return () => unsub();
  }, []);

  // Load cards for the signed-in user from Firestore
  useEffect(() => {
    const loadCards = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setCards([]);
        setSelectedCardId(null);
        return;
      }
      try {
        const cardsRef = collection(db, "cards");
        const q = query(cardsRef, where("user_id", "==", userId));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            cardNumber: data.card_number,
            amount: data.current_amount ?? 0,
            limits: data.limits || [],
            plans: data.plans || [],
            wishes: data.wishes || [],
          };
        });
        setCards(fetched);
        if (fetched.length) {
          setSelectedCardId((prev) => prev && fetched.some((c) => c.id === prev) ? prev : fetched[0].id);
        } else {
          setSelectedCardId(null);
        }
      } catch (err) {
        console.error("Failed to load cards", err);
      }
    };
    loadCards();
  }, [currentUser]);

  // Process scheduled transactions that have passed their scheduled time
  const processScheduledTransactions = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || !cards.length) return;

    try {
      // Get all transactions for all user cards
      const txRef = collection(db, "transactions");
      const allTransactionsSnapshot = await getDocs(txRef);
      const allTransactions = allTransactionsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Process each card
      for (const card of cards) {
        // Get all transactions for this card
        const cardTransactions = allTransactions.filter((tx) => tx.cardId === card.id);
        
        // Find transactions that are scheduled but not yet affected
        // Check if transaction date has passed and it's scheduled but not affected
        const now = new Date();
        const transactionsToProcess = cardTransactions.filter((tx) => {
          const txDate = new Date(tx.date);
          const isPast = txDate <= now;
          return tx.scheduled === true && tx.isAffect === false && isPast;
        });

        if (transactionsToProcess.length === 0) continue;

        // Process each transaction that needs to be applied
        for (const tx of transactionsToProcess) {
          // Update the transaction to mark it as affected
          await updateDoc(doc(db, "transactions", tx.id), {
            isAffect: true,
          });

          // Update the card balance
          const cardToUpdate = cards.find((c) => c.id === tx.cardId);
          if (cardToUpdate) {
            const updatedAmount = tx.type === "cost" 
              ? cardToUpdate.amount - tx.amount 
              : cardToUpdate.amount + tx.amount;
            
            await updateDoc(doc(db, "cards", cardToUpdate.id), { 
              current_amount: updatedAmount 
            });
            
            setCards((prev) => 
              prev.map((c) => (c.id === cardToUpdate.id ? { ...c, amount: updatedAmount } : c))
            );
          }
        }

        // Update local transactions state if this is the selected card
        if (card.id === selectedCardId) {
          const updatedTransactions = transactions.map((t) => {
            const txToUpdate = transactionsToProcess.find((ptx) => ptx.id === t.id);
            if (txToUpdate) {
              return { ...t, isAffect: true };
            }
            return t;
          });
          setTransactions(updatedTransactions);
        }
      }
    } catch (err) {
      console.error("Failed to process scheduled transactions", err);
    }
  };

  // Load transactions for the selected card from Firestore
  useEffect(() => {
    const loadTransactions = async () => {
      if (!selectedCardId) {
        setTransactions([]);
        return;
      }
      try {
        const txRef = collection(db, "transactions");
        const q = query(txRef, where("cardId", "==", selectedCardId), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            includeInExpected: data.includeInExpected !== undefined ? data.includeInExpected : true, // Default to true for backward compatibility
          };
        });
        setTransactions(fetched);
        
        // Process scheduled transactions after loading
        await processScheduledTransactions();
      } catch (err) {
        console.error("Failed to load transactions", err);
      }
    };
    loadTransactions();
  }, [selectedCardId]);

  // Periodic check for scheduled transactions (every 60 seconds)
  useEffect(() => {
    if (cards.length === 0) return;
    
    const interval = setInterval(() => {
      processScheduledTransactions();
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [cards.length]);

  const addCard = async (card) => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Please sign in to add a card.");
        return;
      }

      // Persist to Firestore
      const fsCard = {
        card_number: card.cardNumber,
        current_amount: Number(card.amount),
        user_id: userId,
      };
      const fsResult = await addCardToTable(fsCard);
      if (fsResult.error) {
        throw fsResult.error;
      }

      // Keep local state in sync with existing shape
      const newCard = {
        id: fsResult.id,
        cardNumber: card.cardNumber,
        amount: Number(card.amount),
        limits: card.limits || [],
        plans: card.plans || [],
        wishes: card.wishes || [],
      };
      setCards((prev) => [...prev, newCard]);
      setSelectedCardId(newCard.id);
    } catch (err) {
      console.error("Add card failed", err);
      alert("Failed to add card. Please try again.");
    }
  };

  const addTransaction = async (tx) => {
    const txDate = new Date(tx.date);
    const now = new Date();
    const isFutureTransaction = txDate > now;
    
    // Set scheduled and isAffect properties
    const scheduled = isFutureTransaction;
    const isAffect = !isFutureTransaction; // If not scheduled, it affects balance immediately

    // Check limit if it's a cost transaction (only for current transactions)
    if (tx.type === "cost" && !isFutureTransaction) {
      const card = cards.find((c) => c.id === tx.cardId);
      if (card && card.limits && card.limits.length > 0) {
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
        const limit = card.limits.find((l) => l.month === monthKey);

        if (limit) {
          // Calculate current month spending (only transactions that affect balance)
          const currentMonthSpending = transactions
            .filter((t) => {
              if (t.cardId !== tx.cardId || t.type !== "cost") return false;
              if (!t.isAffect) return false; // Exclude transactions that don't affect balance
              const tDate = new Date(t.date);
              const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}`;
              return tMonthKey === monthKey;
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const newTotalSpending = currentMonthSpending + tx.amount;

          if (newTotalSpending > limit.amount) {
            const confirmMessage = `Warning: This transaction will exceed the monthly limit of ${limit.amount} ₼ for ${new Date(txDate.getFullYear(), txDate.getMonth()).toLocaleString("default", { month: "short", year: "numeric" })}.\n\nCurrent spending: ${currentMonthSpending.toFixed(2)} ₼\nAfter this transaction: ${newTotalSpending.toFixed(2)} ₼\nLimit: ${limit.amount} ₼\n\nDo you want to proceed?`;

            if (!window.confirm(confirmMessage)) {
              return; // User cancelled
            }
          }
        }
      }
    }

    // Check plan if transaction would cause balance to go below plan amount
    if (!isFutureTransaction) {
      const card = cards.find((c) => c.id === tx.cardId);
      if (card && card.plans && card.plans.length > 0) {
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
        const plan = card.plans.find((p) => p.month === monthKey);

        if (plan) {
          // Calculate what the balance would be after this transaction
          const currentBalance = card.amount || 0;
          const newBalance = tx.type === "cost" 
            ? currentBalance - tx.amount 
            : currentBalance + tx.amount;

          if (newBalance < plan.amount) {
            const confirmMessage = `Warning: This transaction will cause your balance to go below the monthly plan minimum of ${plan.amount} ₼ for ${new Date(txDate.getFullYear(), txDate.getMonth()).toLocaleString("default", { month: "short", year: "numeric" })}.\n\nCurrent balance: ${currentBalance.toFixed(2)} ₼\nAfter this transaction: ${newBalance.toFixed(2)} ₼\nPlan minimum: ${plan.amount} ₼\n\nDo you want to proceed?`;

            if (!window.confirm(confirmMessage)) {
              return; // User cancelled
            }
          }
        }
      }
    }

    try {
      // Add scheduled and isAffect properties to transaction
      const txWithFlags = {
        ...tx,
        scheduled,
        isAffect,
      };
      
      const fsResult = await addTransactionToTable(txWithFlags);
      if (fsResult.error) throw fsResult.error;
      const newTx = { id: fsResult.id, ...txWithFlags };

      if (tx.cardId === selectedCardId) {
        setTransactions((prev) => [newTx, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

      // Only update balance if transaction affects balance (isAffect is true)
      if (isAffect) {
        const card = cards.find((c) => c.id === newTx.cardId);
        if (card) {
          const updatedAmount = newTx.type === "cost" ? card.amount - newTx.amount : card.amount + newTx.amount;
          await updateDoc(doc(db, "cards", card.id), { current_amount: updatedAmount });
          setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, amount: updatedAmount } : c)));
        }
      }
    } catch (err) {
      console.error("Add transaction failed", err);
      alert("Failed to add transaction. Please try again.");
    }
  };

  const deleteTransaction = async (txId) => {
    const transaction = transactions.find((t) => t.id === txId);
    if (!transaction) return;

    try {
      await deleteDoc(doc(db, "transactions", txId));
      setTransactions((prev) => prev.filter((t) => t.id !== txId));

      // Update card balance - reverse the transaction effect (only if it was already applied)
      if (transaction.isAffect) {
        const card = cards.find((c) => c.id === transaction.cardId);
        if (card) {
          const updatedAmount =
            transaction.type === "cost"
              ? card.amount + transaction.amount
              : card.amount - transaction.amount;
          await updateDoc(doc(db, "cards", card.id), { current_amount: updatedAmount });
          setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, amount: updatedAmount } : c)));
        }
      }
    } catch (err) {
      console.error("Delete transaction failed", err);
      alert("Failed to delete transaction. Please try again.");
    }
  };

  const deleteCard = async (cardId) => {
    try {
      // Delete all transactions for this card first
      const txRef = collection(db, "transactions");
      const q = query(txRef, where("cardId", "==", cardId));
      const snapshot = await getDocs(q);
      const deleteTxPromises = snapshot.docs.map((d) => deleteDoc(doc(db, "transactions", d.id)));
      await Promise.all(deleteTxPromises);

      // Delete the card
      await deleteDoc(doc(db, "cards", cardId));

      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setTransactions((prev) => prev.filter((t) => t.cardId !== cardId));

      const remainingCards = cards.filter((c) => c.id !== cardId);
      if (remainingCards.length > 0) {
        setSelectedCardId(remainingCards[0].id);
      } else {
        setSelectedCardId(null);
      }
    } catch (err) {
      console.error("Delete card failed", err);
      alert("Failed to delete card. Please try again.");
    }
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);

  // Gate UI: if not signed in, show auth only
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to continue</h1>
          <p className="text-sm text-gray-600 mb-4">
            Please sign in or sign up to access your cards and dashboard.
          </p>
          <AuthPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">Birbank Cashback</h1>
          <button
            onClick={() => signOut(auth)}
            className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column: card & actions */}
          <div className="flex flex-col">
            {/* Card Selector Dropdown */}
            <div className="mb-4">
              <CardSelector
                cards={cards}
                selected={selectedCardId}
                onSelect={setSelectedCardId}
                onDelete={deleteCard}
              />
            </div>

            {/* Card Display */}
            {selectedCard && (
              <CardDisplay
                card={selectedCard}
                transactions={transactions.filter((t) => t.cardId === selectedCardId)}
                onManageLimits={() => setShowLimitModal(true)}
                onManagePlans={() => setShowPlanModal(true)}
                onManageWishes={() => setShowWishModal(true)}
              />
            )}

            {/* Action Buttons */}
            <ActionButtons
              onAddCard={() => setShowAddCard(true)}
              onAddTransaction={() => setShowAddTx(true)}
            />
          </div>

          {/* Right column: transactions */}
          <div className="h-full">
            <div className="mb-4">
              <CardSelector
                cards={cards}
                selected={selectedCardId}
                onSelect={setSelectedCardId}
                onDelete={deleteCard}
              />
            </div>
            <div className="h-[calc(100vh-10rem)]">
              <TransactionList
                transactions={transactions.filter((t) => t.cardId === selectedCardId)}
                onDeleteTransaction={deleteTransaction}
                currentCard={selectedCard}
                onToggleIncludeInExpected={async (txId, newValue) => {
                  try {
                    await updateDoc(doc(db, "transactions", txId), {
                      includeInExpected: newValue,
                    });
                    setTransactions((prev) =>
                      prev.map((t) => (t.id === txId ? { ...t, includeInExpected: newValue } : t))
                    );
                  } catch (err) {
                    console.error("Failed to update transaction", err);
                    alert("Failed to update transaction. Please try again.");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onSubmit={addCard}
        />
      )}

      {showAddTx && (
        <AddTransactionModal
          onClose={() => setShowAddTx(false)}
          onSubmit={addTransaction}
          cards={cards}
          defaultCardId={selectedCardId}
        />
      )}

      {showLimitModal && selectedCard && (
        <CardLimitModal
          card={selectedCard}
          onClose={() => setShowLimitModal(false)}
          onUpdate={(updatedCard) => {
            setCards(prev => prev.map(c => (c.id === updatedCard.id ? updatedCard : c)));
          }}
        />
      )}

      {showPlanModal && selectedCard && (
        <CardPlanModal
          card={selectedCard}
          onClose={() => setShowPlanModal(false)}
          onUpdate={(updatedCard) => {
            setCards(prev => prev.map(c => (c.id === updatedCard.id ? updatedCard : c)));
          }}
        />
      )}

      {showWishModal && selectedCard && (
        <CardWishModal
          card={selectedCard}
          onClose={() => setShowWishModal(false)}
          onUpdate={(updatedCard) => {
            setCards(prev => prev.map(c => (c.id === updatedCard.id ? updatedCard : c)));
          }}
        />
      )}
    </div>
  );
}
