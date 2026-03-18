import { z } from "zod";
import {
  AggregateField,
  FieldValue,
  type CollectionReference,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QuerySnapshot,
  type Unsubscribe
} from "firebase-admin/firestore";
import type {
  CollectionConfig,
  SnapshotPayload,
  WithId
} from "../../core/firestore/types.js";
import { buildTimestampPayload } from "../../core/firestore/utils.js";

export type BackendCollectionQueryBuilder = (
  ref: CollectionReference
) => Query;

export type BackendCollectionSetOptions = {
  merge?: boolean;
  timestampMode?: "create" | "update" | "none";
};

export type BackendCollectionDocumentSnapshot<TSchema extends z.ZodTypeAny> = SnapshotPayload<
  WithId<z.output<TSchema>> | null,
  DocumentSnapshot
>;

export type BackendCollectionQuerySnapshot<TSchema extends z.ZodTypeAny> = SnapshotPayload<
  WithId<z.output<TSchema>>[],
  QuerySnapshot
>;

export class BackendFirestoreCollection<TSchema extends z.ZodTypeAny> {
  private readonly firestore;
  private readonly collectionPath;
  private readonly schema;
  private readonly partialSchema;
  private readonly timestamps;

  constructor(config: CollectionConfig<TSchema, Firestore>) {
    this.firestore = config.firestore;
    this.collectionPath = config.collectionPath;
    this.schema = config.schema;
    this.partialSchema = config.partialSchema ??
      (config.schema instanceof z.ZodObject ? config.schema.partial().passthrough() : undefined);
    this.timestamps = config.timestamps;
  }

  public collectionRef() {
    return this.firestore.collection(this.collectionPath);
  }

  public docRef(id: string) {
    return this.collectionRef().doc(id);
  }

  public parse(data: unknown): z.output<TSchema> {
    return this.schema.parse(data);
  }

  public safeParse(data: unknown) {
    return this.schema.safeParse(data);
  }

  private buildQuery(queryBuilder?: BackendCollectionQueryBuilder): Query {
    const base = this.collectionRef();
    if (queryBuilder === undefined) {
      return base;
    }

    return queryBuilder(base);
  }

  public async get(id: string): Promise<WithId<z.output<TSchema>> | null> {
    const result = await this.getWithSnapshot(id);
    return result.data;
  }

  public async getWithSnapshot(id: string): Promise<BackendCollectionDocumentSnapshot<TSchema>> {
    const snapshot = await this.docRef(id).get();

    if (snapshot.exists === false) {
      return {
        data: null,
        snapshot
      };
    }

    const parsed = this.schema.parse(snapshot.data());

    return {
      data: {
        id: snapshot.id,
        ...parsed
      } as WithId<z.output<TSchema>>,
      snapshot
    };
  }

  public async list(queryBuilder?: BackendCollectionQueryBuilder): Promise<WithId<z.output<TSchema>>[]> {
    const result = await this.listWithSnapshot(queryBuilder);
    return result.data;
  }

  public async listWithSnapshot(
    queryBuilder?: BackendCollectionQueryBuilder
  ): Promise<BackendCollectionQuerySnapshot<TSchema>> {
    const snapshot = await this.buildQuery(queryBuilder).get();

    return {
      data: snapshot.docs.map((entry) => ({
        id: entry.id,
        ...this.schema.parse(entry.data())
      })) as WithId<z.output<TSchema>>[],
      snapshot
    };
  }

  public watch(
    id: string,
    onChange: (value: BackendCollectionDocumentSnapshot<TSchema>) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return this.docRef(id).onSnapshot((snapshot) => {
      if (snapshot.exists === false) {
        onChange({ data: null, snapshot });
        return;
      }

      const parsed = this.schema.parse(snapshot.data());
      onChange({
        data: {
          id: snapshot.id,
          ...parsed
        } as WithId<z.output<TSchema>>,
        snapshot
      });
    }, onError);
  }

  public watchList(
    onChange: (value: BackendCollectionQuerySnapshot<TSchema>) => void,
    queryBuilder?: BackendCollectionQueryBuilder,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const query = this.buildQuery(queryBuilder);

    return query.onSnapshot((snapshot) => {
      onChange({
        data: snapshot.docs.map((entry) => ({
          id: entry.id,
          ...this.schema.parse(entry.data())
        })) as WithId<z.output<TSchema>>[],
        snapshot
      });
    }, onError);
  }

  public async add(data: z.input<TSchema>): Promise<string> {
    const parsed = this.schema.parse(data);
    const payload = {
      ...parsed,
      ...buildTimestampPayload(this.timestamps, "create", () => FieldValue.serverTimestamp())
    };

    const response = await this.collectionRef().add(payload);
    return response.id;
  }

  public async set(
    id: string,
    data: z.input<TSchema>,
    options: BackendCollectionSetOptions = {}
  ): Promise<void> {
    const parsed = this.schema.parse(data);
    const timestampMode = options.timestampMode ?? "create";
    const timestampPayload = timestampMode === "none"
      ? {}
      : buildTimestampPayload(this.timestamps, timestampMode, () => FieldValue.serverTimestamp());

    await this.docRef(id).set({
      ...parsed,
      ...timestampPayload
    }, { merge: options.merge ?? false });
  }

  public async update(id: string, data: Partial<z.input<TSchema>>): Promise<void> {
    const parsed = this.partialSchema
      ? this.partialSchema.parse(data)
      : data;

    await this.docRef(id).update({
      ...parsed,
      ...buildTimestampPayload(this.timestamps, "update", () => FieldValue.serverTimestamp())
    });
  }

  public async remove(id: string): Promise<void> {
    await this.docRef(id).delete();
  }

  public async arrayUnion(id: string, field: string, ...values: unknown[]): Promise<void> {
    await this.docRef(id).update({
      [field]: FieldValue.arrayUnion(...values),
      ...buildTimestampPayload(this.timestamps, "update", () => FieldValue.serverTimestamp())
    });
  }

  public async arrayRemove(id: string, field: string, ...values: unknown[]): Promise<void> {
    await this.docRef(id).update({
      [field]: FieldValue.arrayRemove(...values),
      ...buildTimestampPayload(this.timestamps, "update", () => FieldValue.serverTimestamp())
    });
  }

  public async count(queryBuilder?: BackendCollectionQueryBuilder) {
    const snapshot = await this.buildQuery(queryBuilder).count().get();
    return snapshot.data().count;
  }

  public async sum(field: string, queryBuilder?: BackendCollectionQueryBuilder) {
    const snapshot = await this.buildQuery(queryBuilder)
      .aggregate({ total: AggregateField.sum(field) })
      .get();

    return snapshot.data().total;
  }

  public async average(field: string, queryBuilder?: BackendCollectionQueryBuilder) {
    const snapshot = await this.buildQuery(queryBuilder)
      .aggregate({ total: AggregateField.average(field) })
      .get();

    return snapshot.data().total;
  }
}
