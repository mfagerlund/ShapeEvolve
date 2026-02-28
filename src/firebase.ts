import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: 'shapeevolve',
  appId: '1:215313804376:web:df6ca6ba6009487deaae2d',
  storageBucket: 'shapeevolve.firebasestorage.app',
  apiKey: 'AIzaSyCEQzTDC1RBvWEQgSI9Prl7Nmedmns2vF4',
  authDomain: 'shapeevolve.firebaseapp.com',
  messagingSenderId: '215313804376',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
