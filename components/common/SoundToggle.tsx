// components/common/SoundToggle.tsx — the one switch for all sounds
import React, { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "./Ionicons";
import { onSoundChange, setSoundOn, soundOn, soundSupported } from "../../utils/sound";

export function useSoundOn() {
  const [on, setOn] = useState(soundOn());
  useEffect(() => onSoundChange(setOn), []);
  return on;
}

export default function SoundToggle({ color, background, label = false }: { color: string; background?: string; label?: boolean }) {
  const on = useSoundOn();
  if (!soundSupported) return null;
  return (
    <Pressable
      onPress={() => setSoundOn(!on)}
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityLabel={on ? "Sounds on. Tap to silence" : "Sounds off. Tap to turn on"}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, minWidth: 36, justifyContent: "center",
        paddingHorizontal: label ? 12 : 8, borderRadius: 999, backgroundColor: background ?? "transparent", opacity: pressed ? 0.65 : 1,
      })}
    >
      <Ionicons name={on ? "volume-medium-outline" : "volume-mute-outline"} size={19} color={color} />
      {label ? <Text style={{ color, fontSize: 13.5, fontWeight: "600" }}>{on ? "Sound on" : "Sound off"}</Text> : null}
    </Pressable>
  );
}
