export type {
  CollectionConfig,
  DictionaryConfig,
  FirestoreTimestampOptions,
  SnapshotPayload,
  WithId
} from "./firestore/types.js";

export {
  buildTimestampPayload,
  mergeRootKeyPayload,
  resolveImageCompressionMb
} from "./firestore/utils.js";
