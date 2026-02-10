// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// @ts-ignore

import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAPr91QAw6PF3CIk-UwB2AUX422G8htftA",
  authDomain: "washxpress-19b94.firebaseapp.com",
  projectId: "washxpress-19b94",
  storageBucket: "washxpress-19b94.firebasestorage.app",
  messagingSenderId: "1080986101352",
  appId: "1:1080986101352:web:0f218c4b6ee20a42377ddd",
  measurementId: "G-91X78MCHQ5"
};
console.log("🔍 Initializing Firebase with project:", firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
console.log("✅ Firebase initialized");