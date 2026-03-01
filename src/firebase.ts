import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  projectId: 'shapeevolve',
  appId: '1:215313804376:web:df6ca6ba6009487deaae2d',
  storageBucket: 'shapeevolve.firebasestorage.app',
  apiKey: 'AIzaSyCEQzTDC1RBvWEQgSI9Prl7Nmedmns2vF4',
  authDomain: 'shapeevolve.firebaseapp.com',
  messagingSenderId: '215313804376',
  // TODO: enable Analytics in Firebase console, then add measurementId here
  // measurementId: 'G-XXXXXXXXXX',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Analytics initializes automatically once measurementId is added to config
export let analytics: Analytics | null = null;
try { analytics = getAnalytics(app); } catch { /* analytics not configured yet */ }
