import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useAdmin } from "@/src/admin";
import { GameButton, Icon } from "@/src/components/ui";
import { useToast } from "@/src/toast";

export default function AdminLogin() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAdmin();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.show("أدخل البريد وكلمة المرور", "error");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/admin");
    } catch (e: any) {
      toast.show(e?.message || "بيانات الدخول غير صحيحة", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Pressable style={styles.back} onPress={() => router.replace("/login")}>
        <Icon name="chevron-right" size={26} color={colors.onSurface} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Icon name="shield-crown" size={44} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>لوحة تحكم هيبة</Text>
        <Text style={styles.subtitle}>HEEBA PUBG Rewards Management</Text>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="البريد الإلكتروني"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            testID="admin-email"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="كلمة المرور"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            testID="admin-password"
          />
          <GameButton title="دخول" icon="login" onPress={submit} loading={busy} testID="admin-submit" style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 24 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", paddingBottom: 60 },
  logo: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  title: { color: colors.onSurface, fontSize: 26, fontFamily: fonts.textBold, textAlign: "center" },
  subtitle: { color: colors.brandSecondary, fontSize: 13, fontFamily: fonts.displaySemiBold, textAlign: "center", letterSpacing: 1, marginTop: 4 },
  form: { gap: 12, marginTop: 32 },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, color: colors.onSurface, fontSize: 15, fontFamily: fonts.textRegular, textAlign: "right" },
}));
