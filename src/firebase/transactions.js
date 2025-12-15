import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./client";

// Adds a transaction to Firestore "transactions" collection
// Expected fields: cardId, title, type, category, amount, date (ISO string)
export const addTransactionToTable = async (tx) => {
  try {
    const docRef = await addDoc(collection(db, "transactions"), {
      cardId: tx.cardId,
      title: tx.title,
      type: tx.type,
      category: tx.category,
      amount: Number(tx.amount),
      date: tx.date,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { error };
  }
};

