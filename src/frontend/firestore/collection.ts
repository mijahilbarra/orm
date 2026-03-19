import {
  addDoc,
  arrayRemove,
  arrayUnion,
  type CollectionReference,
  collection,
  count,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  sum,
  average,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QuerySnapshot,
  type Unsubscribe
} from "firebase/firestore";
import { z } from "zod";
import type {
  CollectionConfig,
  SnapshotPayload,
  WithId
} from "../../core/firestore/types.js";
import { buildTimestampPayload } from "../../core/firestore/utils.js";

export type CollectionSetOptions = {
  merge?: boolean;
  timestampMode?: "create" | "update" | "none";
};

export type FrontendCollectionDocumentSnapshot<TSchema extends z.ZodTypeAny> = SnapshotPayload<
  WithId<z.output<TSchema>> | null,
  DocumentSnapshot
>;

export type FrontendCollectionQuerySnapshot<TSchema extends z.ZodTypeAny> = SnapshotPayload<
  WithId<z.output<TSchema>>[],
  QuerySnapshot
>;

export type CollectionQueryBuilder = (
  ref: CollectionReference
) => Query;

export class FirestoreCollection<TSchema extends z.ZodTypeAny> {
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
    return collection(this.firestore, this.collectionPath);
  }

  public docRef(id: string) {
    return doc(this.firestore, this.collectionPath, id);
  }

  public parse(data: unknown): z.output<TSchema> {
    return this.schema.parse(data);
  }

  public safeParse(data: unknown) {
    return this.schema.safeParse(data);
  }

  private buildQuery(queryBuilder?: CollectionQueryBuilder): Query {
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

  public async getWithSnapshot(id: string): Promise<FrontendCollectionDocumentSnapshot<TSchema>> {
    const snapshot = await getDoc(this.docRef(id));

    if (!snapshot.exists()) {
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

  public async list(queryBuilder?: CollectionQueryBuilder): Promise<WithId<z.output<TSchema>>[]> {
    const result = await this.listWithSnapshot(queryBuilder);
    return result.data;
  }

  public async listWithSnapshot(
    queryBuilder?: CollectionQueryBuilder
  ): Promise<FrontendCollectionQuerySnapshot<TSchema>> {
    const snapshot = await getDocs(this.buildQuery(queryBuilder));

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
    onChange: (value: FrontendCollectionDocumentSnapshot<TSchema>) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(this.docRef(id), (snapshot) => {
      if (!snapshot.exists()) {
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
    onChange: (value: FrontendCollectionQuerySnapshot<TSchema>) => void,
    queryBuilder?: CollectionQueryBuilder,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const baseQuery = this.buildQuery(queryBuilder);

    return onSnapshot(baseQuery, (snapshot) => {
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
      ...buildTimestampPayload(this.timestamps, "create", () => serverTimestamp())
    };
    const response = await addDoc(this.collectionRef(), payload);
    return response.id;
  }

  public async set(id: string, data: z.input<TSchema>, options: CollectionSetOptions = {}): Promise<void> {
    const parsed = this.schema.parse(data);
    const timestampMode = options.timestampMode ?? "create";
    const timestampPayload = timestampMode === "none"
      ? {}
      : buildTimestampPayload(this.timestamps, timestampMode, () => serverTimestamp());

    await setDoc(this.docRef(id), {
      ...parsed,
      ...timestampPayload
    }, { merge: options.merge ?? false });
  }

  public async update(id: string, data: Partial<z.input<TSchema>>): Promise<void> {
    const parsed = this.partialSchema
      ? this.partialSchema.parse(data)
      : data;

    await updateDoc(this.docRef(id), {
      ...parsed,
      ...buildTimestampPayload(this.timestamps, "update", () => serverTimestamp())
    });
  }

  public async remove(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }

  public async arrayUnion(
    id: string,
    field: string,
    ...values: unknown[]
  ): Promise<void> {
    await updateDoc(this.docRef(id), {
      [field]: arrayUnion(...values),
      ...buildTimestampPayload(this.timestamps, "update", () => serverTimestamp())
    });
  }

  public async arrayRemove(
    id: string,
    field: string,
    ...values: unknown[]
  ): Promise<void> {
    await updateDoc(this.docRef(id), {
      [field]: arrayRemove(...values),
      ...buildTimestampPayload(this.timestamps, "update", () => serverTimestamp())
    });
  }

  public async sum(
    field: string,
    queryBuilder?: CollectionQueryBuilder
  ) {
    const snapshot = await getAggregateFromServer(this.buildQuery(queryBuilder), {
      total: sum(field)
    });
    return snapshot.data().total;
  }

  public async average(
    field: string,
    queryBuilder?: CollectionQueryBuilder
  ) {
    const snapshot = await getAggregateFromServer(this.buildQuery(queryBuilder), {
      total: average(field)
    });
    return snapshot.data().total;
  }

  public async count(
    queryBuilder?: CollectionQueryBuilder
  ) {
    const snapshot = await getAggregateFromServer(this.buildQuery(queryBuilder), {
      total: count()
    });
    return snapshot.data().total;
  }
}
