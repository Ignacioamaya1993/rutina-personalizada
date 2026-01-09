// scripts/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu3nHGer8Uq32ua1kRYhPj-N6ouNQoLtc",
  authDomain: "rutina-personalizada-gym.firebaseapp.com",
  projectId: "rutina-personalizada-gym",
  storageBucket: "rutina-personalizada-gym.firebasestorage.app",
  messagingSenderId: "599405966018",
  appId: "1:599405966018:web:0b6fa6ee225a142db8415b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
