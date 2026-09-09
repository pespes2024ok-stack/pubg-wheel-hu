import { useState } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { GameButton, Icon } from "@/src/components/ui";

export function GuestLock({ title, subtitle, icon = "lock-outline" }: { title: string; subtitle?: string; icon?: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="guest-lock">
      <View style={styles.iconWrap}>
        <Icon name={icon} size={44} color={colors.brandSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <GameButton title="الدخول عبر Google" icon="google" onPress={login} loading={busy} testID="guestlock-login" style={{ alignSelf: "stretch", marginTop: 20 }} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { color: colors.onSurface, fontSize: 22, fontFamily: fonts.textBold, textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 14, fontFamily: fonts.textRegular, textAlign: "center", marginTop: 8, lineHeight: 20 },
}));
