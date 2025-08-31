// components/layout/ResponsivePage.tsx
import React from "react";
import { Platform, View, ViewProps } from "react-native";

type Props = ViewProps & {
  maxWidth?: number;
  padding?: number;
};

export default function ResponsivePage({
  children,
  style,
  maxWidth = 980,   // tweak to taste: 960 / 1100 / 1280
  padding = 16,      // horizontal padding
  ...rest
}: Props) {
  if (Platform.OS !== "web") {
    // Native: behave like a normal container (no width limit)
    return (
      <View style={[{ flex: 1 }, style]} {...rest}>
        {children}
      </View>
    );
  }

  // Web: center and constrain width
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View
        style={[
          {
            width: "80%",
            maxWidth,
            paddingHorizontal: padding,
            flex: 1,
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </View>
  );
}

