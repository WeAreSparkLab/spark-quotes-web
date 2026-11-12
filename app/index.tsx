// app/index.tsx
//
// Home: the Living Worlds experience.
//
// Deliberately does NOT wait for the Supabase session before rendering. The
// quote is public and the screen works logged out, so there is no reason to
// hold a visitor on a spinner; the save button simply picks up the session
// when it arrives. The original home screen lives on at /classic.
import React, { useState } from "react";
import { Platform } from "react-native";
import WorldsScreen from "../components/screens/WorldsScreen";
import InstallPrompt from "../components/InstallPrompt";

export default function App() {
  const [bannerShowing, setBannerShowing] = useState(false);
  return (
    <>
      <WorldsScreen topInset={bannerShowing ? 84 : 0} />
      {Platform.OS === "web" ? <InstallPrompt onVisibleChange={setBannerShowing} /> : null}
    </>
  );
}
