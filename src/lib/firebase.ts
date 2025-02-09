import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Check for required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
] as const;

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  if (typeof window === 'undefined') {
    // Only throw on server side to prevent breaking static generation
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  } else {
    console.error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate config before initialization
const isValidConfig = Object.values(firebaseConfig).every(value => value !== undefined && value !== null);

// Initialize Firebase
let app: FirebaseApp = getApps()[0];

if (!app) {
  if (!isValidConfig && process.env.NODE_ENV === 'development') {
    console.warn(
      'Firebase config is incomplete. Please check your environment variables.'
    );
  }

  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // In production, we'll still try to initialize even with incomplete config
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Critical: Failed to initialize Firebase");
    }
    // In development, provide a dummy app to prevent crashes
    if (process.env.NODE_ENV === 'development') {
      console.warn("Using dummy Firebase app for development");
      app = initializeApp({ ...firebaseConfig, apiKey: 'dummy-key' });
    }
  }
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };