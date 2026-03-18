import { z } from "zod";
import {
  FieldValue,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe
} from "firebase-admin/firestore";
import type {
  DictionaryConfig,
  SnapshotPayload
} from "../../core/firestore/types.js";
import { buildTimestampPayload, mergeRootKeyPayload } from "../../core/firestore/utils.js";

export type BackendDictionarySetOptions = {
  merge?: boolean;
  timestampMode?: "create" | "update" | "none";
};

type DictionaryValue<TSchema extends z.ZodTypeAny> =
  z.input<TSchema> extends Record<string, infer TValue>
    ? TValue
    : never;

export type BackendDictionarySnapshot<TSchema extends z.ZodType<Record<string, unknown>>> = SnapshotPayload<
  z.output<TSchema> | null,
  DocumentSnapshot
>;

export class BackendFirestoreDictionary<TSchema extends z.ZodType<Record<string, unknown>>> {
  private readonly firestore;
  private readonly collectionPath;
  private readonly documentId;
  private readonly schema;
  private readonly rootKey;
  private readonly timestamps;

  constructor(config: DictionaryConfig<TSchema, Firestore>) {
    this.firestore = config.firestore;
    this.collectionPath = config.collectionPath;
    this.documentId = config.documentId;
    this.schema = config.schema;
    this.rootKey = config.rootKey;
    this.timestamps = config.timestamps;
  }

  public docRef() {
    return this.firestore.collection(this.collectionPath).doc(this.documentId);
  }

  public parse(data: unknown): z.output<TSchema> {
    return this.schema.parse(data);
  }

  public safeParse(data: unknown) {
    return this.schema.safeParse(data);
  }

  public async get(): Promise<z.output<TSchema> | null> {
    const result = await this.getWithSnapshot();
    return result.data;
  }

  public async getWithSnapshot(): Promise<BackendDictionarySnapshot<TSchema>> {
    const snapshot = await this.docRef().get();

    if (snapshot.exists === false) {
      return {
        data: null,
        snapshot
      };
    }

    const raw = snapshot.data();
    const nested = this.rootKey ? raw?.[this.rootKey] : raw;

    return {
      data: this.schema.parse(nested),
      snapshot
    };
  }

  public watch(
    onChange: (value: BackendDictionarySnapshot<TSchema>) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return this.docRef().onSnapshot((snapshot) => {
      if (snapshot.exists === false) {
        onChange({ data: null, snapshot });
        return;
      }

      const raw = snapshot.data();
      const nested = this.rootKey ? raw?.[this.rootKey] : raw;

      onChange({
        data: this.schema.parse(nested),
        snapshot
      });
    }, onError);
  }

  public async set(data: z.input<TSchema>, options: BackendDictionarySetOptions = {}): Promise<void> {
    const parsed = this.schema.parse(data);
    const timestampMode = options.timestampMode ?? "create";
    const timestampPayload = timestampMode === "none"
      ? {}
      : buildTimestampPayload(this.timestamps, timestampMode, () => FieldValue.serverTimestamp());

    const payload = {
      ...mergeRootKeyPayload(this.rootKey, parsed as Record<string, unknown>),
      ...timestampPayload
    };

    await this.docRef().set(payload, { merge: options.merge ?? true });
  }

  public async setKey(key: string, value: DictionaryValue<TSchema>): Promise<void> {
    const current = (await this.get()) ?? ({} as z.output<TSchema>);
    const next = {
      ...(current as Record<string, unknown>),
      [key]: value
    } as z.input<TSchema>;

    await this.set(next, { merge: true, timestampMode: "update" });
  }

  public async removeKey(key: string): Promise<void> {
    if (this.rootKey && this.rootKey.trim()) {
      const path = this.rootKey + "." + key;
      await this.docRef().update({
        [path]: FieldValue.delete(),
        ...buildTimestampPayload(this.timestamps, "update", () => FieldValue.serverTimestamp())
      });
      return;
    }

    await this.docRef().update({
      [key]: FieldValue.delete(),
      ...buildTimestampPayload(this.timestamps, "update", () => FieldValue.serverTimestamp())
    });
  }
}
