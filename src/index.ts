export * from "./core/index.js";
export * from "./frontend/index.js";
export * as frontend from "./frontend/index.js";
export * as backend from "./backend/index.js";

export {
  BackendFirestoreCollection,
  BackendFirestoreDictionary,
  BackendStorageClient,
  createBackendOrm,
  initializeBackendFirebase
} from "./backend/index.js";

export type {
  BackendCollectionDocumentSnapshot,
  BackendCollectionQueryBuilder,
  BackendCollectionQuerySnapshot,
  BackendCollectionSetOptions,
  BackendDictionarySetOptions,
  BackendDictionarySnapshot,
  BackendFirebaseContext,
  BackendFirebaseInitOptions,
  BackendImageCompressor,
  BackendImageCompressorInput,
  BackendImageUploadOptions,
  BackendImageUploadResult,
  BackendStorageClientOptions,
  CreateBackendOrmOptions
} from "./backend/index.js";
