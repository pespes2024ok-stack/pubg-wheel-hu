// Design tokens for HEEBA / هيبة — a dark-first, military/tactical PUBG-style
// gaming rewards app. The app is dark-first: the `light` palette below holds
// the dark values so the UI stays consistent regardless of the device setting.
//
// Keys match the "color" block of /app/design_guidelines.json. Build styles
// with makeStyles() and read useTheme().colors for color props. Never write
// color literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const palette = {
  // Surfaces
  surface: "#0F1115",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#191B21",
  onSurfaceSecondary: "#E0E0E0",
  surfaceTertiary: "#22252C",
  onSurfaceTertiary: "#B0B4BA",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#0F1115",
  muted: "#757A85",

  // Brand
  brand: "#F5B301",
  onBrand: "#17130A",
  brandPrimary: "#F5B301",
  onBrandPrimary: "#17130A",
  brandSecondary: "#FFD65A",
  onBrandSecondary: "#17130A",
  brandTertiary: "#4B5320",
  onBrandTertiary: "#FFFFFF",

  // Status
  success: "#4CAF50",
  onSuccess: "#FFFFFF",
  warning: "#FF9800",
  onWarning: "#FFFFFF",
  error: "#F44336",
  onError: "#FFFFFF",
  info: "#607D8B",
  onInfo: "#FFFFFF",

  // Lines
  border: "#2A2D35",
  borderStrong: "#40444F",
  divider: "#1E2028",

  // Rarity tiers (custom, per design guidelines)
  rarityCommon: "#9E9E9E",
  rarityRare: "#4CAF50",
  rarityEpic: "#FF5722",
  rarityLegendary: "#FFD700",
};

export type ThemeColors = typeof palette;

export const defaultScheme = "light" satisfies ColorScheme;

// Dark-first: both schemes use the same dark palette so the device setting
// never washes out the tactical look.
export const themes: { light: ThemeColors; dark?: ThemeColors } = {
  light: palette,
  dark: palette,
};

export const fonts = {
  displayMedium: "Rajdhani-Medium",
  displaySemiBold: "Rajdhani-SemiBold",
  displayBold: "Rajdhani-Bold",
  textRegular: "Cairo-Regular",
  textSemiBold: "Cairo-SemiBold",
  textBold: "Cairo-Bold",
};

export const rarityColor = (rarity: string, colors: ThemeColors) => {
  switch (rarity) {
    case "legendary":
      return colors.rarityLegendary;
    case "epic":
      return colors.rarityEpic;
    case "rare":
      return colors.rarityRare;
    default:
      return colors.rarityCommon;
  }
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.("dark");

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
