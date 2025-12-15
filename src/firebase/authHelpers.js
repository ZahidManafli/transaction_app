import { auth } from "./client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { signOut } from "firebase/auth";
import { addUserToTable } from "./users";

export async function signUpWithProfile(name, surname, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profileResult = await addUserToTable({ id: cred.user.uid, name, surname, email });
    if (profileResult.error) {
      return { error: profileResult.error };
    }
    // Store user id locally for later use
    localStorage.setItem("userId", cred.user.uid);
    // After signup, sign out so user returns to sign-in screen
    await signOut(auth);
    return { user: cred.user };
  } catch (error) {
    return { error };
  }
}

export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Store user id locally for later use
    localStorage.setItem("userId", cred.user.uid);
    return { user: cred.user };
  } catch (error) {
    return { error };
  }
}

