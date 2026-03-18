import type { Firestore } from "firebase/firestore";
import type { z } from "zod";
import type {
  CollectionConfig as SharedCollectionConfig,
  DictionaryConfig as SharedDictionaryConfig,
  FirestoreTimestampOptions,
  SnapshotPayload,
  WithId
} from "../core/firestore/types.js";

export type { FirestoreTimestampOptions, SnapshotPayload, WithId };

export type CollectionConfig<TSchema extends z.ZodTypeAny> =
  SharedCollectionConfig<TSchema, Firestore>;

export type DictionaryConfig<TSchema extends z.ZodType<Record<string, unknown>>> =
  SharedDictionaryConfig<TSchema, Firestore>;
