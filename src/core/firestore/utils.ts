import type { FirestoreTimestampOptions } from "./types.js";

export type TimestampPayload<TTimestampValue> = Record<string, TTimestampValue>;

const DEFAULT_TIMESTAMP_FIELDS = {
  createdAtField: "createdAt",
  updatedAtField: "updatedAt"
};

export function buildTimestampPayload<TTimestampValue>(
  options: FirestoreTimestampOptions | undefined,
  mode: "create" | "update",
  createTimestampValue: () => TTimestampValue
): TimestampPayload<TTimestampValue> {
  if (!options?.enabled) {
    return {};
  }

  const createdAtField = options.createdAtField || DEFAULT_TIMESTAMP_FIELDS.createdAtField;
  const updatedAtField = options.updatedAtField || DEFAULT_TIMESTAMP_FIELDS.updatedAtField;

  if (mode === "create") {
    return {
      [createdAtField]: createTimestampValue(),
      [updatedAtField]: createTimestampValue()
    };
  }

  return {
    [updatedAtField]: createTimestampValue()
  };
}

export function mergeRootKeyPayload(
  rootKey: string | undefined,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (rootKey && rootKey.trim()) {
    return {
      [rootKey.trim()]: data
    };
  }

  return { ...data };
}

export function resolveImageCompressionMb(
  options: { imageCompressionMb?: number; imageCompress?: number } | undefined
): number | undefined {
  const rawValue = options?.imageCompressionMb ?? options?.imageCompress;

  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return undefined;
  }

  return rawValue;
}
