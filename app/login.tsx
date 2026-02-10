import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { login } from "../services/authService";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

// Run this ONCE before login
useEffect(() => {
  const clearBadToken = async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("customer");
    console.log("✅ Cleared old tokens");
  };
  clearBadToken();
}, []);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;

      
    }
    

    setIsLoading(true);
    try {
      const result = await login(trimmedEmail, password);

      // Helpful debug: remove later
      console.log("✅ login() result:", result);

      router.replace("/home");
    } catch (error: any) {
      console.log("❌ Login error:", error);

      Alert.alert(
        "Login Failed",
        error?.message ||
        error?.response?.data?.message ||
        "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
      />

      <Pressable
        onPress={handleLogin}
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? "#666" : "black",
          padding: 14,
          borderRadius: 10,
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", textAlign: "center" }}>Login</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.push("/signup")}>
        <Text style={{ textAlign: "center" }}>Create an account</Text>
      </Pressable>
    </View>
  );
}
