import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./client";

// Adds a card to Firestore "cards" collection
export const addCardToTable = async ({ card_number, current_amount, user_id }) => {
  try {
    const docRef = await addDoc(collection(db, "cards"), {
      card_number,
      current_amount,
      user_id,
      limits: [],
      plans: [],
      wishes: [],
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (error) {
    console.error("Error adding card:", error);
    return { error };
  }
};

