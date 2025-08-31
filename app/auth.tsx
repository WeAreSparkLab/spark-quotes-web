// app/auth.tsx
import React from "react";
import AuthScreen from "../components/screens/AuthScreen";
import ResponsivePage from "../components/layout/ResponsivePage";


export default function AuthRoute() {
  return (
    <ResponsivePage maxWidth={1100} padding={20}>
      <AuthScreen />;
    </ResponsivePage>
  )
}
