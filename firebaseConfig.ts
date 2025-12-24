import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCBzeYTEb8e2yRh-CqFAYyx91YjbiCO8Gg",
  authDomain: "control-3140b.firebaseapp.com",
  projectId: "control-3140b",
  storageBucket: "control-3140b.firebasestorage.app",
  messagingSenderId: "554764751676",
  appId: "1:554764751676:web:99c91751b5bebfb4024439"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);