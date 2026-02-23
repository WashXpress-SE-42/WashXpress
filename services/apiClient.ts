import * as SecureStore from "expo-secure-store";
import { auth } from "@/firebaseConfig";



async function getToken() {
  return await SecureStore.getItemAsync("accessToken");
}

async function getUserType() {
  return await SecureStore.getItemAsync("userType"); // 'customer' or 'provider'
}

async function getFreshToken(): Promise<string> {
  // Wait for Firebase to initialize auth state (important for app reopens)
  let currentUser = auth.currentUser;

  if (!currentUser) {
    // Firebase might still be initializing - wait for auth state
    currentUser = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Auth initialization timeout"));
      }, 5000); // 5 second timeout

      const unsubscribe = auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
  }

  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  // Get fresh token (force refresh if needed)
  const idToken = await currentUser.getIdToken(true);

  // Optional: Update stored token for consistency
  await SecureStore.setItemAsync("accessToken", idToken);

  return idToken;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {},
  userType?: 'customer' | 'provider'
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;

  try {
    let token: string | null = null;

    if (requiresAuth) {
      // ✅ Only get fresh token if auth is required
      token = await getFreshToken();
    }

    // Determine base URL based on userType
    const storedUserType = userType || await SecureStore.getItemAsync("userType");
    const baseURL = storedUserType === 'provider'
      ? process.env.EXPO_PUBLIC_PROVIDER_API_URL
      : process.env.EXPO_PUBLIC_CUSTOMER_API_URL;

       console.log('🔍 Base URL:', baseURL);  // ✅ Add this
       console.log('🔍 Endpoint:', endpoint);  // ✅ Add this
       console.log('🔍 Full URL:', `${baseURL}${endpoint}`);  // ✅ Add this

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}