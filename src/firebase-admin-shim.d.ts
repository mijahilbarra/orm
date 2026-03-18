declare module "firebase-admin/app" {
  export type App = { name: string };

  export type ServiceAccount = {
    projectId?: string;
    privateKey?: string;
    clientEmail?: string;
    [key: string]: unknown;
  };

  export type Credential = unknown;

  export type AppOptions = {
    projectId?: string;
    storageBucket?: string;
    credential?: Credential;
    [key: string]: unknown;
  };

  export function applicationDefault(): Credential;
  export function cert(serviceAccount: ServiceAccount): Credential;
  export function getApp(name?: string): App;
  export function getApps(): App[];
  export function initializeApp(options?: AppOptions, name?: string): App;
}

declare module "firebase-admin/firestore" {
  export type Unsubscribe = () => void;

  export class FieldValue {
    static serverTimestamp(): FieldValue;
    static arrayUnion(...values: unknown[]): FieldValue;
    static arrayRemove(...values: unknown[]): FieldValue;
    static delete(): FieldValue;
  }

  export class AggregateField {
    static sum(field: string): unknown;
    static average(field: string): unknown;
  }

  export type DocumentSnapshot = {
    id: string;
    exists: boolean;
    data(): Record<string, unknown> | undefined;
  };

  export type QueryDocumentSnapshot = {
    id: string;
    data(): Record<string, unknown>;
  };

  export type QuerySnapshot = {
    docs: QueryDocumentSnapshot[];
  };

  export type AggregateQuerySnapshot<TData> = {
    data(): TData;
  };

  export type DocumentReference = {
    id: string;
    get(): Promise<DocumentSnapshot>;
    set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
    update(data: Record<string, unknown>): Promise<void>;
    delete(): Promise<void>;
    onSnapshot(
      onNext: (snapshot: DocumentSnapshot) => void,
      onError?: (error: Error) => void
    ): Unsubscribe;
  };

  export type Query = {
    get(): Promise<QuerySnapshot>;
    onSnapshot(
      onNext: (snapshot: QuerySnapshot) => void,
      onError?: (error: Error) => void
    ): Unsubscribe;
    count(): {
      get(): Promise<AggregateQuerySnapshot<{ count: number }>>;
    };
    aggregate(fields: Record<string, unknown>): {
      get(): Promise<AggregateQuerySnapshot<Record<string, unknown>>>;
    };
  };

  export type CollectionReference = Query & {
    doc(id: string): DocumentReference;
    add(data: Record<string, unknown>): Promise<{ id: string }>;
  };

  export type Firestore = {
    collection(path: string): CollectionReference;
  };

  export function getFirestore(app?: unknown): Firestore;
}

declare module "firebase-admin/storage" {
  export type BucketFile = {
    save(
      data: Uint8Array,
      options?: {
        resumable?: boolean;
        metadata?: {
          contentType?: string;
          cacheControl?: string;
          metadata?: Record<string, string>;
        };
      }
    ): Promise<void>;
    makePublic(): Promise<void>;
  };

  export type Bucket = {
    name: string;
    file(path: string): BucketFile;
  };

  export type Storage = {
    bucket(name?: string): Bucket;
  };

  export function getStorage(app?: unknown): Storage;
}
