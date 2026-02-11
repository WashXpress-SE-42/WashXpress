import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL ?? "http://192.168.1.2:3000";

async function getToken() {
  return await SecureStore.getItemAsync("accessToken");
}

async function getUserType() {
  return await SecureStore.getItemAsync("userType"); // 'customer' or 'provider'
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  userType?: 'customer' | 'provider' // Optional override
): Promise<T> {
  const token = await getToken();
  const storedUserType = userType || await getUserType() || 'customer';

  const res = await fetch(`${API_BASE_URL}/api/${storedUserType}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return {} as T;
  }

  return res.json();
}