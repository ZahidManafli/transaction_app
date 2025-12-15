// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnIv7aiKIr95IihFVElLXw0kGUJJQiE1I",
  authDomain: "card-transaction-1dbff.firebaseapp.com",
  projectId: "card-transaction-1dbff",
  storageBucket: "card-transaction-1dbff.firebasestorage.app",
  messagingSenderId: "482157303066",
  appId: "1:482157303066:web:f471d0ccdddea31ebf08a3",
  measurementId: "G-5W1H4NWLL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);