import {
  GithubAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import type { AuthMember } from "../types/tracking";

type ProviderKey = "github" | "google_docs";

export type AuthFlowResult = {
  member: AuthMember | null;
  accessToken: string | null;
  provider: ProviderKey | null;
  redirectStarted?: boolean;
};

function mapUser(user: User): AuthMember {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Team Member",
    email: user.email ?? "",
    providerIds: user.providerData.map((item) => item.providerId),
  };
}

function isPopupIssue(code?: string) {
  return code === "auth/popup-closed-by-user" || code === "auth/popup-blocked";
}

async function ensurePersistence() {
  if (!auth) return;
  await setPersistence(auth, browserLocalPersistence);
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/documents.readonly");
  provider.addScope("https://www.googleapis.com/auth/drive.metadata.readonly");
  provider.setCustomParameters({
    prompt: "select_account",
  });
  return provider;
}

function githubProvider() {
  const provider = new GithubAuthProvider();
  provider.addScope("read:user");
  provider.addScope("repo");
  return provider;
}

export async function signInWithGoogle(): Promise<AuthFlowResult> {
  if (!auth) throw new Error("Firebase auth is not configured.");
  await ensurePersistence();
  const provider = googleProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return {
      member: mapUser(result.user),
      accessToken: credential?.accessToken ?? null,
      provider: "google_docs",
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (!isPopupIssue(code)) throw error;
    await signInWithRedirect(auth, provider);
    return { member: null, accessToken: null, provider: "google_docs", redirectStarted: true };
  }
}

export async function signInWithGitHub(): Promise<AuthFlowResult> {
  if (!auth) throw new Error("Firebase auth is not configured.");
  await ensurePersistence();
  const provider = githubProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    return {
      member: mapUser(result.user),
      accessToken: credential?.accessToken ?? null,
      provider: "github",
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (!isPopupIssue(code)) throw error;
    await signInWithRedirect(auth, provider);
    return { member: null, accessToken: null, provider: "github", redirectStarted: true };
  }
}

export async function consumeRedirectAuthResult(): Promise<AuthFlowResult> {
  if (!auth) return { member: null, accessToken: null, provider: null };
  const result = await getRedirectResult(auth);
  if (!result) return { member: null, accessToken: null, provider: null };

  const providerId = result.providerId;
  if (providerId === "google.com") {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return {
      member: mapUser(result.user),
      accessToken: credential?.accessToken ?? null,
      provider: "google_docs",
    };
  }
  if (providerId === "github.com") {
    const credential = GithubAuthProvider.credentialFromResult(result);
    return {
      member: mapUser(result.user),
      accessToken: credential?.accessToken ?? null,
      provider: "github",
    };
  }
  return { member: mapUser(result.user), accessToken: null, provider: null };
}

export async function signOutCurrentUser() {
  if (!auth) return;
  await signOut(auth);
}

export function watchAuthState(callback: (member: AuthMember | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? mapUser(user) : null);
  });
}
