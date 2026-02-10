import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./apiClient";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../firebaseConfig";

export async function getToken() {
  return SecureStore.getItemAsync("accessToken");
}

function ensureToken(token: unknown): string {
  if (!token || typeof token !== "string") {
    throw new Error("No valid token returned from server");
  }
  return token;
}

export async function login(email: string, password: string) {
  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const customToken = ensureToken(res.data?.token);
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();

  await SecureStore.setItemAsync("accessToken", idToken);
  await SecureStore.setItemAsync(
    "customer",
    JSON.stringify(res.data?.user ?? null)
  );

  return res.data?.user;
}

export async function signup(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}) {
  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const customToken = ensureToken(res.data?.token);
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();

  await SecureStore.setItemAsync("accessToken", idToken);
  await SecureStore.setItemAsync(
    "customer",
    JSON.stringify(res.data?.user ?? null)
  );

  return res.data?.user;
}

// ✅ Add this back!
export interface CustomerProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export async function getProfile() {
  return apiFetch<CustomerProfile>("/profile");
}

export async function signOut() {
  try {
    await apiFetch("/auth/signout", { method: "POST" });
    await auth.signOut();
  } catch {
    // ignore if token expired etc.
  }
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("customer");
}