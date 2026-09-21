import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Public by design - a Firestore Web API key restricted to the Firestore
// API only. Access control is enforced by Firestore security rules
// (signals/*: read-only for clients), not by hiding this string.
const firebaseConfig = {
  apiKey: 'AIzaSyCW2X0J8Cawx9dY7zl74TuZ99ifoO7nBMM',
  projectId: 'europeansports-490205',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
