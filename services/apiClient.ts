import { auth } from "@/firebaseConfig";
import * as SecureStore from "expo-secure-store";



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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullURL = `${baseURL}${endpoint}`;
    console.log(`🚀 API Request [${fetchOptions.method || 'GET'}] ${fullURL}`);

    // Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(fullURL, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // errorText is not JSON
        }

        // 1. Graceful handling for "pending requests" 404 or empty results
        // If the endpoint is for pending bookings and we get a 404, treat it as "no bookings"
        if (response.status === 404 && endpoint.includes('status=pending')) {
          console.log(`ℹ️ [apiClient] Gracefully handling 404 for pending bookings endpoint: ${endpoint}`);
          return { success: true, data: { bookings: [], count: 0 } } as any;
        }

        // 2. Extract readable error message
        let errorMessage = `HTTP ${response.status}`;
        if (errorData) {
          // Extract meaningful fields: message, error, detail
          errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
          
          // Ensure it's not still an object (e.g. if some weird JSON was returned)
          if (typeof errorMessage !== 'string') {
            errorMessage = JSON.stringify(errorMessage);
          }
        } else if (errorText && errorText.length < 200) {
          errorMessage = errorText;
        }

        // 3. Log detailed error info for debugging
        console.error(`❌ API Error [${response.status}] ${fullURL}:`, errorData || errorText);
        
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success [${endpoint}]`);
      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and server IP.');
      }
      throw error;
    }
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error;
  }
}