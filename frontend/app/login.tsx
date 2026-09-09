import { useState } from "react";
import { View, Text, Pressable, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { GameButton, Icon } from "@/src/components/ui";
import { Sparks } from "@/src/components/sparks";
import { useBackgrounds, pickBackground } from "@/src/hooks";
import { useToast } from "@/src/toast";

export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, continueAsGuest } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });
  const bgs = useBackgrounds();
  const bg = pickBackground(bgs.data, "login", settings?.home_background);

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signIn();
    } catch (e: any) {
      toast.show(e?.message || "تعذر تسجيل الدخول", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: bg || "https://images.unsplash.com/photo-1710438399422-2fca27686bcd?q=85&w=1200" }}
      style={styles.bg}
    >
      <LinearGradient colors={["rgba(15,17,21,0.5)", "rgba(15,17,21,0.85)", colors.surface]} style={styles.overlay}>
        <Sparks count={20} />
        <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <Icon name="crown" size={44} color={colors.brandSecondary} />
            </View>
            <Text style={styles.brand}>هيبة</Text>
            <Text style={styles.brandEn}>HEEBA</Text>
            <View style={styles.tagWrap}>
              <View style={styles.tagLine} />
              <Text style={styles.tag}>PUBG REWARDS & LUCKY WHEEL</Text>
              <View style={styles.tagLine} />
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.features}>
            <Feature icon="ferris-wheel" label="عجلة الحظ اليومية" />
            <Feature icon="treasure-chest" label="جوائز PUBG حصرية" />
            <Feature icon="storefront" label="متجر الجوائز" />
          </View>

          <View style={styles.actions}>
            <GameButton title="الدخول عبر Google" icon="google" onPress={onGoogle} loading={busy} testID="google-login-button" />
            <GameButton title="تصفّح كزائر" icon="eye-outline" variant="outline" onPress={async () => { await continueAsGuest(); router.replace("/(tabs)"); }} testID="guest-browse-button" />
            <Pressable style={styles.adminLink} onPress={() => router.push("/admin/login")} testID="admin-login-link">
              <Icon name="shield-crown-outline" size={16} color={colors.muted} />
              <Text style={styles.adminText}>دخول الأدمن</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

function Feature({ icon, label }: { icon: any; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={22} color={colors.brandPrimary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bg: { flex: 1, backgroundColor: colors.surface },
  overlay: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  brandWrap: { alignItems: "center", marginTop: 20 },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.surfaceSecondary + "CC",
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brand: { color: colors.onSurface, fontSize: 48, fontFamily: fonts.textBold, lineHeight: 56 },
  brandEn: { color: colors.brandSecondary, fontSize: 26, fontFamily: fonts.displayBold, letterSpacing: 6 },
  tagWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  tagLine: { width: 24, height: 1, backgroundColor: colors.muted },
  tag: { color: colors.onSurfaceTertiary, fontSize: 10, fontFamily: fonts.displaySemiBold, letterSpacing: 2 },
  spacer: { flex: 1 },
  features: { flexDirection: "row", justifyContent: "space-around", marginBottom: 28 },
  feature: { alignItems: "center", gap: 8, flex: 1 },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary + "AA",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontFamily: fonts.textSemiBold, textAlign: "center" },
  actions: { gap: 14 },
  adminLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 },
  adminText: { color: colors.muted, fontSize: 13, fontFamily: fonts.textSemiBold },
}));
