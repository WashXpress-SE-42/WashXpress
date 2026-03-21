import { auth } from "@/firebaseConfig";
import * as SecureStore from "expo-secure-store";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Manually invalidate specific cache routes
 * @param endpointPrefix - e.g., '/subscriptions'
 */
export function invalidateCache(endpointPrefix?: string) {
  if (!endpointPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(endpointPrefix)) {
      apiCache.delete(key);
    }
  }
}

async function getToken() {
  return await SecureStore.getItemAsync("accessToken");
}

async function getUserType() {
  return await SecureStore.getItemAsync("userType"); // 'customer' or 'provider'
}

async function getFreshToken(): Promise<string> {
  let currentUser = auth.currentUser;

  if (!currentUser) {
    currentUser = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Auth initialization timeout"));
      }, 5000);

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

  const idToken = await currentUser.getIdToken(true);
  await SecureStore.setItemAsync("accessToken", idToken);
  return idToken;
}

export interface ApiFetchOptions extends RequestInit {
  requiresAuth?: boolean;
  useCache?: boolean;
  onBackgroundUpdate?: (data: any) => void;
}

// The core fetch execution payload
async function executeFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
  userType?: 'customer' | 'provider'
): Promise<T> {
  const { requiresAuth = true, useCache, onBackgroundUpdate, ...fetchOptions } = options;

  let token: string | null = null;
  if (requiresAuth) {
    token = await getFreshToken();
  }

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      } catch (e) {}

      if (response.status === 404 && endpoint.includes('status=pending')) {
        console.log(`ℹ️ [apiClient] Gracefully handling 404 for pending bookings endpoint: ${endpoint}`);
        return { success: true, data: { bookings: [], count: 0 } } as any;
      }

      let errorMessage = 'Something went wrong';
      if (errorData) {
        errorMessage = errorData.message || (errorData.error && errorData.error.message) || errorData.error || errorText;
        if (typeof errorMessage !== 'string') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } else {
        errorMessage = errorText;
      }

      const method = fetchOptions.method || 'GET';
      if (errorMessage === 'Route not found') {
        console.error(`⚠️  [apiClient] Route not found (404) for: [${method}] ${fullURL}. Please verify backend route registration.`);
      } else {
        console.error(`❌ API Error [${response.status}] ${fullURL}:`, errorData || errorText);
      }
      
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
}

// Wrapper to handle Caching, Stale-While-Revalidate, and Deduplication
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
  userType?: 'customer' | 'provider'
): Promise<T> {
  const isGet = !options.method || options.method === 'GET';
  const shouldCache = isGet && options.useCache;
  const cacheKey = `${userType || 'default'}_${endpoint}`;

  // 1. Return cached data immediately (Stale-While-Revalidate logic)
  if (shouldCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      const isStale = Date.now() - cached.timestamp > CACHE_TTL;
      
      // If stale, fire a background request silently
      if (isStale) {
        console.log(`🔄 SWR Background Fetch triggered for: ${endpoint}`);
        executeFetch<T>(endpoint, options, userType)
          .then(data => {
            apiCache.set(cacheKey, { data, timestamp: Date.now() });
            if (options.onBackgroundUpdate) {
              options.onBackgroundUpdate(data);
            }
          })
          .catch(err => console.log(`⚠️ SWR Background Fetch failed for ${endpoint}:`, err));
      }
      return cached.data as T;
    }
  }

  // 2. Request Deduplication (avoid flying identical GETs simultaneously)
  if (isGet) {
    if (pendingRequests.has(cacheKey)) {
      console.log(`♻️  Deduplicating API Request: ${endpoint}`);
      return pendingRequests.get(cacheKey) as Promise<T>;
    }
  }

  // 3. Execute the network request
  const promise = executeFetch<T>(endpoint, options, userType);
  
  if (isGet) {
    pendingRequests.set(cacheKey, promise);
    promise.finally(() => {
      pendingRequests.delete(cacheKey);
    });
  }

  const data = await promise;

  // 4. Save to cache
  if (shouldCache) {
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  // 5. Automatic invalidation on mutation
  if (!isGet && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
     // Extract base resource (e.g. '/subscriptions' from '/subscriptions/123/cancel')
     const segments = endpoint.split('?')[0].split('/');
     if (segments.length > 1 && segments[1]) {
       console.log(`🧹 Invalidating cache for base route: /${segments[1]}`);
       invalidateCache(`/${segments[1]}`);
     }
  }

  return data;
}