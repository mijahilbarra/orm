import type { z } from "zod";

export type WithId<T> = T & { id: string };

export type FirestoreTimestampOptions = {
  enabled?: boolean;
  createdAtField?: string;
  updatedAtField?: string;
};

export type CollectionConfig<TSchema extends z.ZodTypeAny, TFirestore> = {
  firestore: TFirestore;
  collectionPath: string;
  schema: TSchema;
  timestamps?: FirestoreTimestampOptions;
  partialSchema?: z.ZodTypeAny;
};

export type DictionaryConfig<
  TSchema extends z.ZodType<Record<string, unknown>>,
  TFirestore
> = {
  firestore: TFirestore;
  collectionPath: string;
  documentId: string;
  schema: TSchema;
  rootKey?: string;
  timestamps?: FirestoreTimestampOptions;
};

export type SnapshotPayload<TData, TRawSnapshot> = {
  data: TData;
  snapshot: TRawSnapshot;
};
