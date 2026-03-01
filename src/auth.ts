import { signal, effect } from '@preact/signals';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export const user = signal<User | null>(null);
export const authReady = signal(false);

onAuthStateChanged(auth, async (u) => {
  user.value = u;
  authReady.value = true;

  // Upsert user profile on sign-in
  if (u) {
    const userRef = doc(db, 'users', u.uid);
    const snap = await getDoc(userRef);
    setDoc(
      userRef,
      {
        displayName: u.displayName,
        photoURL: u.photoURL,
        lastSeen: serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  }
});

const provider = new GoogleAuthProvider();

export async function signIn() {
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await fbSignOut(auth);
}
