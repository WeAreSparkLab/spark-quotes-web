// app/submitQuote.tsx
import { View, StyleSheet } from "react-native";
import SubmitQuoteScreen from "../components/screens/SubmitQuoteScreen";

export default function SubmitQuoteRoute() {
  return (
    <View style={styles.container}>
      <SubmitQuoteScreen />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 } });
