import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

// Initialize Auth
const auth = getAuth(app);

/**
 * Recursively strips undefined, NaN, and invalid values for Firestore compatibility
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null) return null as unknown as T;
  if (typeof obj === 'number') {
    return (Number.isNaN(obj) ? 0 : obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export { app, db, auth };
