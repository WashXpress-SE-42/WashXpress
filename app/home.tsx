import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getProfile, signOut, CustomerProfile } from "../services/authService";

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error: any) {
      console.error("Profile fetch error:", error);
      // Handle token expiry / unauthorized
      if (error.message?.includes("401") || error.message?.toLowerCase().includes("unauthorized")) {
        handleLogout();
      } else {
        Alert.alert("Error", "Failed to load profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>
        Welcome, {profile?.firstName || "Customer"}! 👋
      </Text>
      <Text>You are successfully logged in to WashXpress.</Text>

      <Pressable
        onPress={handleLogout}
        style={{ marginTop: 20, padding: 12, backgroundColor: "#f0f0f0", borderRadius: 8 }}
      >
        <Text style={{ color: "red", textAlign: "center", fontWeight: "600" }}>Logout</Text>
      </Pressable>
    </View>
  );
}
