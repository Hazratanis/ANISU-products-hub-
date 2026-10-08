// ============================================
// ANISU PRODUCTS HUB - Firebase Configuration
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Aapki Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBwQRGOCDyfy_9p2sSPVRnE6LMOn9BTJio",
  authDomain: "anisu-product-hub.firebaseapp.com",
  projectId: "anisu-product-hub",
  storageBucket: "anisu-product-hub.firebasestorage.app",
  messagingSenderId: "519969720144",
  appId: "1:519969720144:web:f8d99a855ff0d664e40e55"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Export karo taaki baaki files use kar sakein
export { 
  db, 
  storage, 
  auth,
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  ref, 
  uploadBytes, 
  getDownloadURL,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};