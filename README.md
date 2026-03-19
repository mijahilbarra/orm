# orm

Libreria TypeScript para trabajar con Firebase en **frontend** y **backend** con:

- modelos Firestore validados con `zod`
- snapshots tipados para Firestore y sesion
- upload de imagenes a Storage con compresion opcional
- auth frontend configurable (`email/password`, `google`)

## Instalacion

```bash
npm install orm zod firebase firebase-admin
```

`firebase-admin` solo es necesario para backend.

## Frontend

```ts
import { createFrontendOrm } from "orm";
import { z } from "zod";

const orm = createFrontendOrm({
  firebaseConfig: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    appId: "..."
  },
  services: {
    firestore: true,
    auth: true,
    storage: true
  },
  authProviders: {
    emailPassword: true,
    google: true
  }
});

const users = orm.createCollection({
  collectionPath: "users",
  schema: z.object({
    name: z.string(),
    role: z.string()
  }),
  timestamps: { enabled: true }
});

const authSnapshot = orm.authClient?.getSessionSnapshot();
const userDoc = await users.getWithSnapshot("uid-1");

if (orm.storageClient) {
  await orm.storageClient.uploadImage({
    file,
    directory: "avatars",
    imageCompressionMb: 1
    // alias legacy soportado:
    // imageCompress: 1
  });
}
```

## Backend

```ts
import { createBackendOrm } from "orm";
import { z } from "zod";

const orm = createBackendOrm({
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  services: {
    firestore: true,
    storage: true
  }
});

const users = orm.createCollection({
  collectionPath: "users",
  schema: z.object({
    name: z.string(),
    role: z.string()
  }),
  timestamps: { enabled: true }
});

const result = await users.listWithSnapshot();

if (orm.storageClient) {
  await orm.storageClient.uploadImage({
    directory: "avatars",
    contentType: "image/jpeg",
    bytes: imageBuffer,
    imageCompressionMb: 1
  });
}
```

## Subpaths

- `orm/frontend`
- `orm/backend`
