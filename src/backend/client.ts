import { z } from "zod";
import {
  BackendFirestoreCollection,
  BackendFirestoreDictionary,
  type CollectionConfig,
  type DictionaryConfig
} from "./firestore/index.js";
import { initializeBackendFirebase, type BackendFirebaseInitOptions } from "./app.js";
import {
  BackendStorageClient,
  type BackendImageCompressor
} from "./storage/index.js";

export type CreateBackendOrmOptions = BackendFirebaseInitOptions & {
  storage?: {
    imageCompressor?: BackendImageCompressor;
  };
};

export function createBackendOrm(options: CreateBackendOrmOptions = {}) {
  const context = initializeBackendFirebase(options);

  const storageClient = context.bucket
    ? new BackendStorageClient({
      bucket: context.bucket,
      imageCompressor: options.storage?.imageCompressor
    })
    : undefined;

  return {
    ...context,
    storageClient,
    createCollection<TSchema extends z.ZodTypeAny>(
      config: Omit<CollectionConfig<TSchema, NonNullable<typeof context.firestore>>, "firestore">
    ) {
      if (context.firestore === undefined) {
        throw new Error("Firestore is not initialized. Enable services.firestore in initializeBackendFirebase.");
      }

      return new BackendFirestoreCollection({
        ...config,
        firestore: context.firestore
      });
    },
    createDictionary<TSchema extends z.ZodType<Record<string, unknown>>>(
      config: Omit<DictionaryConfig<TSchema, NonNullable<typeof context.firestore>>, "firestore">
    ) {
      if (context.firestore === undefined) {
        throw new Error("Firestore is not initialized. Enable services.firestore in initializeBackendFirebase.");
      }

      return new BackendFirestoreDictionary({
        ...config,
        firestore: context.firestore
      });
    }
  };
}
