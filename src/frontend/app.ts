import {
  type FirebaseApp,
  type FirebaseOptions,
  getApp,
  getApps,
  initializeApp
} from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

export type FrontendFirebaseInitOptions = {
  firebaseConfig: FirebaseOptions;
  appName?: string;
  services?: {
    firestore?: boolean;
    auth?: boolean;
    storage?: boolean;
  };
};

export type FrontendFirebaseContext = {
  app: FirebaseApp;
  firestore?: Firestore;
  auth?: Auth;
  storage?: FirebaseStorage;
};

function resolveClientApp(config: FirebaseOptions, appName?: string): FirebaseApp {
  if (appName && appName.trim()) {
    const existing = getApps().find((entry) => entry.name === appName);
    if (existing) {
      return existing;
    }

    return initializeApp(config, appName);
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(config);
}

export function initializeFrontendFirebase(options: FrontendFirebaseInitOptions): FrontendFirebaseContext {
  const app = resolveClientApp(options.firebaseConfig, options.appName);
  const serviceFlags = options.services ?? {};

  const shouldInitFirestore = serviceFlags.firestore !== false;
  const shouldInitAuth = serviceFlags.auth === true;
  const shouldInitStorage = serviceFlags.storage === true;

  return {
    app,
    firestore: shouldInitFirestore ? getFirestore(app) : undefined,
    auth: shouldInitAuth ? getAuth(app) : undefined,
    storage: shouldInitStorage ? getStorage(app) : undefined
  };
}
