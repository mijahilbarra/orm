import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
  type ServiceAccount
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Bucket } from "firebase-admin/storage";

export type BackendFirebaseInitOptions = {
  appName?: string;
  projectId?: string;
  storageBucket?: string;
  serviceAccount?: ServiceAccount;
  useApplicationDefault?: boolean;
  services?: {
    firestore?: boolean;
    storage?: boolean;
  };
};

export type BackendFirebaseContext = {
  app: App;
  firestore?: Firestore;
  bucket?: Bucket;
};

function resolveAdminApp(options: BackendFirebaseInitOptions): App {
  const name = options.appName && options.appName.trim() ? options.appName.trim() : "[DEFAULT]";

  const existing = getApps().find((entry) => entry.name === name);
  if (existing) {
    return name === "[DEFAULT]" ? getApp() : getApp(name);
  }

  const appOptions: AppOptions = {
    projectId: options.projectId,
    storageBucket: options.storageBucket
  };

  if (options.serviceAccount) {
    appOptions.credential = cert(options.serviceAccount);
  } else if (options.useApplicationDefault !== false) {
    appOptions.credential = applicationDefault();
  }

  if (name === "[DEFAULT]") {
    return initializeApp(appOptions);
  }

  return initializeApp(appOptions, name);
}

export function initializeBackendFirebase(options: BackendFirebaseInitOptions = {}): BackendFirebaseContext {
  const app = resolveAdminApp(options);
  const serviceFlags = options.services ?? {};

  const shouldInitFirestore = serviceFlags.firestore !== false;
  const shouldInitStorage = serviceFlags.storage === true;

  return {
    app,
    firestore: shouldInitFirestore ? getFirestore(app) : undefined,
    bucket: shouldInitStorage ? getStorage(app).bucket(options.storageBucket) : undefined
  };
}
