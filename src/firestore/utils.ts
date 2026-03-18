import { serverTimestamp, type FieldValue } from "firebase/firestore";
import type { FirestoreTimestampOptions } from "./types.js";
import {
  buildTimestampPayload as buildSharedTimestampPayload,
  mergeRootKeyPayload
} from "../core/firestore/utils.js";

export type TimestampPayload = Record<string, FieldValue>;

export function buildTimestampPayload(
  options: FirestoreTimestampOptions | undefined,
  mode: "create" | "update"
): TimestampPayload {
  return buildSharedTimestampPayload(options, mode, () => serverTimestamp());
}

export { mergeRootKeyPayload };
