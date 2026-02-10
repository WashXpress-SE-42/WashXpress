import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { getProfile, signOut, CustomerProfile } from "@/services/authService";



export default function HomeScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const p = await getProfile();
        if (!alive) return;
        setProfile(p);
      } catch (e: any) {
        // If token is missing/invalid/expired, force logout + redirect to login
        try {
          await signOut();
        } catch { }
        router.replace("/(tabs)");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const name =
    profile?.firstName
      ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
      : "there";

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          {loading ? "Loading..." : `Welcome, ${name}!`}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Profile</ThemedText>

        {loading ? (
          <ThemedText>Fetching your account details…</ThemedText>
        ) : (
          <>
            <ThemedText>
              Email: <ThemedText type="defaultSemiBold">{profile?.email ?? "-"}</ThemedText>
            </ThemedText>
            <ThemedText>
              Phone: <ThemedText type="defaultSemiBold">{profile?.phone ?? "-"}</ThemedText>
            </ThemedText>
          </>
        )}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Next</ThemedText>
        <ThemedText>
          Next we’ll connect your <ThemedText type="defaultSemiBold">Bookings</ThemedText> and{" "}
          <ThemedText type="defaultSemiBold">Subscriptions</ThemedText> to the backend.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  card: {
    gap: 8,
    paddingVertical: 12,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },

});
