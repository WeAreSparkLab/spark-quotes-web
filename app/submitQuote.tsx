// app/submitQuote.tsx
import { View, StyleSheet } from "react-native";
import SubmitQuoteScreen from "../components/screens/SubmitQuoteScreen";
import ResponsivePage from "../components/layout/ResponsivePage";


export default function SubmitQuoteRoute() {
  return (
    <View style={styles.container}>
      <ResponsivePage maxWidth={1100} padding={20}>
        <SubmitQuoteScreen />
      </ResponsivePage>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 } });
