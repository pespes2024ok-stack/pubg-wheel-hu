import React from "react";
import { ActivityIndicator, Pressable, Text, View, ViewStyle, StyleProp } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { resolveImage } from "@/src/api";

export function Icon({
  name,
  size = 24,
  color,
}: {
  name: any;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <MaterialDesignIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

export function Img({
  uri,
  style,
  fallbackIcon = "image-off-outline",
}: {
  uri?: string | null;
  style?: any;
  fallbackIcon?: any;
}) {
  const { colors } = useTheme();
  const src = resolveImage(uri);
  if (!src) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary }, style]}>
        <Icon name={fallbackIcon} size={28} color={colors.muted} />
      </View>
    );
  }
  return <Image source={{ uri: src }} style={style} contentFit="cover" transition={200} />;
}

export function GameButton({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  testID,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline";
  icon?: any;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useBtnStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.brandPrimary : colors.onBrandPrimary} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} size={20} color={variant === "primary" ? colors.onBrandPrimary : variant === "secondary" ? colors.onBrandSecondary : colors.brandPrimary} />
          ) : null}
          <Text
            style={[
              styles.text,
              variant === "secondary" && { color: colors.onBrandSecondary },
              variant === "outline" && { color: colors.brandPrimary },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === "primary") {
    return (
      <Pressable testID={testID} onPress={onPress} disabled={isDisabled} style={({ pressed }) => [style, isDisabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
        <LinearGradient colors={["#FDD84E", colors.brandPrimary, "#D99400"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? { backgroundColor: colors.brandSecondary } : { borderWidth: 1.5, borderColor: colors.brandPrimary, backgroundColor: "transparent" },
        isDisabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function RarityBadge({ rarity, size = "md" }: { rarity: string; size?: "sm" | "md" }) {
  const { colors } = useTheme();
  const c = rarityColor(rarity, colors);
  const label =
    rarity === "legendary" ? "أسطوري" : rarity === "epic" ? "ملحمي" : rarity === "rare" ? "نادر" : "عادي";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c + "22", borderColor: c, borderWidth: 1, borderRadius: 999, paddingHorizontal: size === "sm" ? 6 : 8, paddingVertical: size === "sm" ? 2 : 3 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
      <Text style={{ color: c, fontSize: size === "sm" ? 10 : 11, fontFamily: fonts.textSemiBold }}>{label}</Text>
    </View>
  );
}

export function Coin({ points, size = 14, color }: { points: number | string; size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon name="hexagon-multiple" size={size + 2} color={colors.brandSecondary} />
      <Text style={{ color: color ?? colors.brandSecondary, fontSize: size, fontFamily: fonts.displayBold }}>{points}</Text>
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: colors.brandPrimary }} />
        <Text style={{ color: colors.onSurface, fontSize: 17, fontFamily: fonts.textBold }}>{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.brandSecondary, fontSize: 13, fontFamily: fonts.textSemiBold }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = "inbox-outline", title, subtitle, testID }: { icon?: any; title: string; subtitle?: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 }} testID={testID}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}>
        <Icon name={icon} size={38} color={colors.muted} />
      </View>
      <Text style={{ color: colors.onSurface, fontSize: 16, fontFamily: fonts.textBold, textAlign: "center" }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "center", paddingHorizontal: 32 }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, paddingVertical: 60 }}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useCardStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }} testID="back-button">
        <Icon name="chevron-right" size={26} color={colors.onSurface} />
      </Pressable>
      <Text style={{ color: colors.onSurface, fontSize: 18, fontFamily: fonts.textBold }}>{title}</Text>
      <View style={{ width: 40, alignItems: "center" }}>{right}</View>
    </View>
  );
}

const useBtnStyles = makeStyles((colors) => ({
  base: { borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  text: { color: colors.onBrandPrimary, fontSize: 16, fontFamily: fonts.textBold },
}));

const useCardStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
}));
