import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated
} from "react-native";
import { Header } from "../components/Header";

export default function PaymentScreen() {

  const [cardNumber, setCardNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const flipAnim = useState(new Animated.Value(0))[0];

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"]
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"]
  });

  function flipToBack() {
    Animated.timing(flipAnim, {
      toValue: 180,
      duration: 400,
      useNativeDriver: true
    }).start();
  }

  function flipToFront() {
    Animated.timing(flipAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true
    }).start();
  }

  function formatCard(text: string) {
    return text
      .replace(/\s?/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  }

  function handleCardChange(text: string) {
    setCardNumber(formatCard(text));
  }

  function handlePay() {
    console.log("Processing payment...");
  }

  return (
    <View style={styles.container}>

      <Header title="Payment" />

      <ScrollView contentContainerStyle={styles.content}>

        {/* CARD PREVIEW */}
        <View style={styles.cardContainer}>

          {/* FRONT */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ rotateY: frontInterpolate }] }
            ]}
          >
            <Text style={styles.cardNumber}>
              {cardNumber || "**** **** **** ****"}
            </Text>

            <View style={styles.cardBottom}>
              <Text style={styles.cardText}>
                {holder || "CARD HOLDER"}
              </Text>

              <Text style={styles.cardText}>
                {expiry || "MM/YY"}
              </Text>
            </View>
          </Animated.View>

          {/* BACK */}
          <Animated.View
            style={[
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] }
            ]}
          >
            <View style={styles.blackStrip} />

            <Text style={styles.cvvText}>
              {cvv || "***"}
            </Text>
          </Animated.View>

        </View>

        {/* CARD NUMBER */}
        <Text style={styles.label}>Card Number</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={cardNumber}
          onChangeText={handleCardChange}
          placeholder="1234 5678 9012 3456"
        />

        {/* HOLDER */}
        <Text style={styles.label}>Card Holder</Text>

        <TextInput
          style={styles.input}
          value={holder}
          onChangeText={setHolder}
          placeholder="John Doe"
        />

        {/* ROW */}
        <View style={styles.row}>

          <View style={styles.half}>
            <Text style={styles.label}>Expiry</Text>

            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              value={expiry}
              onChangeText={setExpiry}
              onFocus={flipToFront}
            />
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>CVV</Text>

            <TextInput
              style={styles.input}
              placeholder="123"
              keyboardType="numeric"
              value={cvv}
              onFocus={flipToBack}
              onBlur={flipToFront}
              onChangeText={setCvv}
            />
          </View>

        </View>

        {/* PAY BUTTON */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePay}
        >
          <Text style={styles.payText}>
            Pay Now
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },

  content: {
    padding: 20
  },

  cardContainer: {
    height: 200,
    marginBottom: 30
  },

  card: {
    position: "absolute",
    width: "100%",
    height: 200,
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 20,
    backfaceVisibility: "hidden"
  },

  cardBack: {
    position: "absolute",
    width: "100%",
    height: 200,
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 20,
    backfaceVisibility: "hidden",
    justifyContent: "center"
  },

  blackStrip: {
    height: 40,
    backgroundColor: "#000",
    marginBottom: 20
  },

  cvvText: {
    color: "#fff",
    alignSelf: "flex-end",
    fontSize: 18
  },

  cardNumber: {
    color: "#fff",
    fontSize: 22,
    letterSpacing: 2,
    marginTop: 40
  },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40
  },

  cardText: {
    color: "#fff"
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  half: {
    width: "48%"
  },

  payButton: {
    backgroundColor: "#0ca6e8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30
  },

  payText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  }

});