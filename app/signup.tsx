import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Sign up</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
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
        // TODO: Remove 'as any' once expo-router types are regenerated
        onPress={() => router.replace("/home" as any)}
        style={{ backgroundColor: "black", padding: 14, borderRadius: 10 }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Create account</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={{ textAlign: "center" }}>Back to login</Text>
      </Pressable>
    </View>
  );
}
