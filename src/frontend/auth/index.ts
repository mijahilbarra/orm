import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
  type User
} from "firebase/auth";

export type FrontendAuthProviderFlags = {
  emailPassword?: boolean;
  google?: boolean;
  customToken?: boolean;
};

export type FrontendSessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
  providerIds: string[];
};

export type FrontendSessionSnapshot = {
  hasSession: boolean;
  user: FrontendSessionUser | null;
  raw: User | null;
};

export type FrontendAuthClientOptions = {
  auth: Auth;
  providers?: FrontendAuthProviderFlags;
};

function mapUser(user: User | null): FrontendSessionUser | null {
  if (user === null) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((provider) => provider.providerId)
  };
}

export class FrontendAuthClient {
  private readonly auth;
  private readonly providers;

  constructor(options: FrontendAuthClientOptions) {
    this.auth = options.auth;
    this.providers = {
      emailPassword: options.providers?.emailPassword === true,
      google: options.providers?.google === true,
      customToken: options.providers?.customToken === true
    };
  }

  public isEmailPasswordEnabled(): boolean {
    return this.providers.emailPassword;
  }

  public isGoogleEnabled(): boolean {
    return this.providers.google;
  }

  public isCustomTokenEnabled(): boolean {
    return this.providers.customToken;
  }

  public getSessionSnapshot(): FrontendSessionSnapshot {
    const current = this.auth.currentUser;
    return {
      hasSession: current !== null,
      user: mapUser(current),
      raw: current
    };
  }

  public onSessionSnapshot(listener: (snapshot: FrontendSessionSnapshot) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, (user) => {
      listener({
        hasSession: user !== null,
        user: mapUser(user),
        raw: user
      });
    });
  }

  public async signUpWithEmail(email: string, password: string) {
    this.assertProviderEnabled("emailPassword");
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  public async signInWithEmail(email: string, password: string) {
    this.assertProviderEnabled("emailPassword");
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  public async signInWithGoogle() {
    this.assertProviderEnabled("google");
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  public async signInWithCustomToken(customToken: string) {
    this.assertProviderEnabled("customToken");
    const token = customToken.trim();
    if (!token) {
      throw new Error("Custom token is required.");
    }
    return firebaseSignInWithCustomToken(this.auth, token);
  }

  public async signOut() {
    return signOut(this.auth);
  }

  private assertProviderEnabled(provider: keyof FrontendAuthProviderFlags): void {
    if (provider === "emailPassword" && this.providers.emailPassword !== true) {
      throw new Error("Email/password auth is disabled in this FrontendAuthClient instance.");
    }

    if (provider === "google" && this.providers.google !== true) {
      throw new Error("Google auth is disabled in this FrontendAuthClient instance.");
    }

    if (provider === "customToken" && this.providers.customToken !== true) {
      throw new Error("Custom token auth is disabled in this FrontendAuthClient instance.");
    }
  }
}
