import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ?? "http://10.0.2.2:3000";

async function getToken() {
  return await SecureStore.getItemAsync("accessToken");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
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

  // ✅ Handle empty responses
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return {} as T;
  }

  return res.json();
}