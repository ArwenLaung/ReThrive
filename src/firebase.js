import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsNQb3joZkyer-LZ6VHDjg_BJ_lF7KVss",
  authDomain: "rethrive-usm.firebaseapp.com",
  projectId: "rethrive-usm",
  storageBucket: "rethrive-usm.firebasestorage.app",
  messagingSenderId: "565798855650",
  appId: "1:565798855650:web:15659a15a17b35107d4fbb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools we need
export const auth = getAuth(app);
export const db = getFirestore(app); // Database
export const storage = getStorage(app); // Image Storage