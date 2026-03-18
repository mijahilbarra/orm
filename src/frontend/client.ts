import { z } from "zod";
import { FrontendAuthClient, type FrontendAuthProviderFlags } from "./auth/index.js";
import {
  FirestoreCollection,
  FirestoreDictionary,
  type CollectionConfig,
  type DictionaryConfig
} from "./firestore/index.js";
import { initializeFrontendFirebase, type FrontendFirebaseInitOptions } from "./app.js";
import { FrontendStorageClient } from "./storage/index.js";

export type CreateFrontendOrmOptions = FrontendFirebaseInitOptions & {
  authProviders?: FrontendAuthProviderFlags;
};

export function createFrontendOrm(options: CreateFrontendOrmOptions) {
  const context = initializeFrontendFirebase(options);

  const authClient = context.auth
    ? new FrontendAuthClient({
      auth: context.auth,
      providers: options.authProviders
    })
    : undefined;

  const storageClient = context.storage
    ? new FrontendStorageClient({ storage: context.storage })
    : undefined;

  return {
    ...context,
    authClient,
    storageClient,
    createCollection<TSchema extends z.ZodTypeAny>(
      config: Omit<CollectionConfig<TSchema, NonNullable<typeof context.firestore>>, "firestore">
    ) {
      if (context.firestore === undefined) {
        throw new Error("Firestore is not initialized. Enable services.firestore in initializeFrontendFirebase.");
      }

      return new FirestoreCollection({
        ...config,
        firestore: context.firestore
      });
    },
    createDictionary<TSchema extends z.ZodType<Record<string, unknown>>>(
      config: Omit<DictionaryConfig<TSchema, NonNullable<typeof context.firestore>>, "firestore">
    ) {
      if (context.firestore === undefined) {
        throw new Error("Firestore is not initialized. Enable services.firestore in initializeFrontendFirebase.");
      }

      return new FirestoreDictionary({
        ...config,
        firestore: context.firestore
      });
    }
  };
}
