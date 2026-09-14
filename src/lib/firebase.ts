import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC9UkxikIdKW-MjPCV15fIyqjowROlHnqU",
  authDomain: "spaced-invaders.firebaseapp.com",
  projectId: "spaced-invaders",
  storageBucket: "spaced-invaders.firebasestorage.app",
  messagingSenderId: "1030601863744",
  appId: "1:1030601863744:web:06ab76bccbbafb6a6f25a5",
  measurementId: "G-QT9VSETW5H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
