// utils/storage.ts
// Firebase Storage utilities for WashXpress
// Used by both customer and washer apps

import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { app } from '@/firebaseConfig'; // your existing firebase app instance
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export const storage = getStorage(app);

// ── Upload a single image to Firebase Storage ─────────────────────────────────
export async function uploadImage(
  uri: string,
  path: string, // e.g. 'damage-reports/bookingId/washer_001.jpg'
  onProgress?: (pct: number) => void
): Promise<string> {
  // Compress image before upload (max 1024px, 80% quality)
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(compressed.uri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// ── Upload multiple images ────────────────────────────────────────────────────
export async function uploadImages(
  uris: string[],
  basePath: string,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const url = await uploadImage(uris[i], `${basePath}/${Date.now()}_${i}.jpg`);
    urls.push(url);
    onProgress?.(i + 1, uris.length);
  }
  return urls;
}

// ── Pick images from device library ──────────────────────────────────────────
export async function pickImages(maxCount = 5): Promise<string[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access photos is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: 0.9,
  });

  if (result.canceled) return [];
  return result.assets.map(a => a.uri);
}

// ── Take a photo with camera ──────────────────────────────────────────────────
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission is required.');
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.9,
    allowsEditing: false,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

// ── Storage path helpers ──────────────────────────────────────────────────────
export const StoragePaths = {
  // Pre-job damage photos taken by washer
  damageReport: (bookingId: string) => `damage-reports/${bookingId}`,

  // Complaint evidence uploaded by customer or washer
  complaintEvidence: (complaintId: string) => `complaint-evidence/${complaintId}`,

  // Profile photos
  profilePhoto: (uid: string) => `profile-photos/${uid}.jpg`,
};