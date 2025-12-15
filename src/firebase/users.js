import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./client";

export const addUserToTable = async (user) => {
  try {
    const docRef = await addDoc(collection(db, "users"), {
      uid: user.id || user.uid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (error) {
    console.error("Error adding user:", error);
    return { error };
  }
};

