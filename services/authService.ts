import * as SecureStore from "expo-secure-store";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { apiFetch } from "./apiClient";

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

export async function signin(
  email: string,
  password: string,
  userType: 'customer' | 'provider'
) {
  const endpoint = '/auth/signin';

  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>(endpoint, {  // ✅ Use full endpoint path
    method: "POST",
    body: JSON.stringify({ email, password }),
    requiresAuth: false,
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

  return { user: res.data?.user, userType, token: idToken };
}

export async function signup(
  payload: {
    displayName: string;
    email: string;
    password: string;
    phoneNumber: string;
  },
  userType: 'customer' | 'provider'
) {
  const endpoint = '/auth/signup';

  const res = await apiFetch<{
    data: {
      token: string;
      user: any;
    };
  }>(endpoint, {  // ✅ Use full endpoint path
    method: "POST",
    body: JSON.stringify(payload),
    requiresAuth: false,
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

  return { user: res.data?.user, userType, token: idToken };
}

export interface CustomerProfile {
  uid?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  vehicleInfo?: {
    brand: string;
    model: string;
    color: string;
    plateNumber: string;
  };
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    color: string;
    plateNumber: string;
  }[];
  addresses?: {
    id: string;
    label: string;
    description: string;
  }[];
  services?: {
    id: string;
    name: string;
    price: number;
    duration: string;
  }[];
  subscription?: {
    tier: string;
  };
  area?: string;
  rating?: number;
}

export async function getProfile() {
  return apiFetch<CustomerProfile>("/profile");  // ✅ This is correct with your base URL
}

export async function updateProfile(data: Partial<CustomerProfile>) {
  return apiFetch<CustomerProfile>("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
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