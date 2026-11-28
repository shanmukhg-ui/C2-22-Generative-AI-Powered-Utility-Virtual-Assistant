import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const defaultApiKey = 'AIzaSyBQYbbhvmoZgj7OZjrnf51Kis2uwngV81U';
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const apiKey = (rawApiKey && rawApiKey.trim().length > 0) ? rawApiKey.trim() : defaultApiKey;

const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'c2-22-utility-assistant.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'c2-22-utility-assistant',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'c2-22-utility-assistant.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1013417581459',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1013417581459:web:e9c819d68929248c1e2666',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const isFirebaseConfigured = (): boolean => {
  const k = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(k && k.trim().length > 0 && !k.includes('Placeholder'));
};

export default app;
