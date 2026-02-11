import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./apiClient";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../firebaseConfig";

export async function getToken() {
  return SecureStore.getItemAsync("accessToken");
}

export async function getUserType() {
  return SecureStore.getItemAsync("userType");
}

function ensureToken(token: unknown): string {
  if (!token || typeof token !== "string") {
    throw new Error("No valid token returned from server");
  }
  return token;
}

export async function login(
  email: string, 
  password: string, 
  userType: 'customer' | 'provider'
) {
  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, userType);

  const customToken = ensureToken(res.data?.token);
  console.log("✅ Got custom token from backend");

  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();
  console.log("✅ Got ID token from Firebase");

  await SecureStore.setItemAsync("accessToken", idToken);
  await SecureStore.setItemAsync("userType", userType);
  await SecureStore.setItemAsync(
    userType === 'customer' ? "customer" : "provider",
    JSON.stringify(res.data?.user ?? null)
  );

  return { user: res.data?.user, userType };
}

export async function signup(
  payload: {
    displayName: string;  // ✅ Changed from firstName/lastName
    email: string;
    password: string;
    phoneNumber: string;  // ✅ Changed from phone
  },
  userType: 'customer' | 'provider'
) {
  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  }, userType);

  const customToken = ensureToken(res.data?.token);
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();

  await SecureStore.setItemAsync("accessToken", idToken);
  await SecureStore.setItemAsync("userType", userType);
  await SecureStore.setItemAsync(
    userType === 'customer' ? "customer" : "provider",
    JSON.stringify(res.data?.user ?? null)
  );

  return { user: res.data?.user, userType };
}

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
  await SecureStore.deleteItemAsync("userType");
  await SecureStore.deleteItemAsync("customer");
  await SecureStore.deleteItemAsync("provider");
}