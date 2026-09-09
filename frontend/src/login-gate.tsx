import React, { createContext, useCallback, useContext, useState } from "react";
import { View, Text, Modal, Pressable } from "react-native";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { GameButton, Icon } from "@/src/components/ui";

const Ctx = createContext<{ promptLogin: (message?: string) => void }>({ promptLogin: () => {} });
export const useLoginGate = () => useContext(Ctx);

export function LoginGateProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const promptLogin = useCallback((msg?: string) => {
    setMessage(msg || "سجّل الدخول لإكمال هذه الخطوة");
    setVisible(true);
  }, []);

  const doLogin = async () => {
    setBusy(true);
    try {
      setVisible(false);
      await signIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Ctx.Provider value={{ promptLogin }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.bg}>
          <View style={styles.card} testID="login-gate-modal">
            <View style={styles.icon}>
              <Icon name="lock-open-variant" size={40} color={colors.brandSecondary} />
            </View>
            <Text style={styles.title}>سجّل الدخول أولاً</Text>
            <Text style={styles.msg}>{message}</Text>
            <GameButton title="الدخول عبر Google" icon="google" onPress={doLogin} loading={busy} testID="gate-login-btn" style={{ alignSelf: "stretch", marginTop: 16 }} />
            <Pressable onPress={() => setVisible(false)} style={styles.cancel} testID="gate-cancel">
              <Text style={styles.cancelText}>متابعة التصفح</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((colors) => ({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 30 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center", width: "100%", maxWidth: 340 },
  icon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surfaceTertiary, borderWidth: 2, borderColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { color: colors.onSurface, fontSize: 22, fontFamily: fonts.textBold },
  msg: { color: colors.muted, fontSize: 14, fontFamily: fonts.textRegular, textAlign: "center", marginTop: 6 },
  cancel: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  cancelText: { color: colors.muted, fontSize: 14, fontFamily: fonts.textSemiBold },
}));
