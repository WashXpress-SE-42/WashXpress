import { View, TextInput, Button, Text } from "react-native";
import { useState } from "react";
import { login } from "@/services/authService";
import { useRouter } from "expo-router";

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        try {
            await login(email, password);
            router.replace("/(tabs)");
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <View>
            <TextInput placeholder="Email" onChangeText={setEmail} />
            <TextInput placeholder="Password" secureTextEntry onChangeText={setPassword} />
            {error ? <Text>{error}</Text> : null}
            <Button title="Login" onPress={handleLogin} />
        </View>
    );
}
