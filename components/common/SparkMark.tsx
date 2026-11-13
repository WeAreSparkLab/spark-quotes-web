// components/common/SparkMark.tsx — the gold spark
//
// A four-pointed star with softly curved sides, in a warm gold gradient.
// Drawn as SVG so it looks the same everywhere (a text glyph would depend on
// the font). The same shape is used for the tab icon and app icons.

import React from "react";
import { Platform, Text, View } from "react-native";

export const SPARK_PATH = "M12 0C12.9 7.1 16.9 11.1 24 12C16.9 12.9 12.9 16.9 12 24C11.1 16.9 7.1 12.9 0 12C7.1 11.1 11.1 7.1 12 0Z";

export function sparkSvg(glow = true) {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='#FBE7B0'/><stop offset='0.5' stop-color='#E9C26A'/><stop offset='1' stop-color='#C38A33'/>` +
    `</linearGradient>` +
    (glow ? `<filter id='f' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='1.4'/></filter>` : "") +
    `</defs>` +
    (glow ? `<path d='${SPARK_PATH}' fill='#F4D58D' opacity='0.55' filter='url(#f)'/>` : "") +
    `<path d='${SPARK_PATH}' fill='url(#g)'/></svg>`
  );
}

export default function SparkMark({ size = 18, glow = true }: { size?: number; glow?: boolean }) {
  if (Platform.OS !== "web") {
    return <Text style={{ color: "#E9C26A", fontSize: size * 0.9, lineHeight: size }}>{"✦"}</Text>;
  }
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(sparkSvg(glow))}")`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      } as any}
    />
  );
}
