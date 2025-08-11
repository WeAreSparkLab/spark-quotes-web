// app/submitQuote.tsx
// This file acts as the route for /submitQuote
import SubmitQuoteScreen from "../components/screens/SubmitQuoteScreen"; // Corrected import path
import { Stack } from "expo-router";

export default function SubmitQuoteRoute() {
  return (
    <>
      <SubmitQuoteScreen />
    </>
  );
}
