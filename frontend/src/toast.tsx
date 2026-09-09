import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { makeStyles, useTheme, fonts } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; msg: string; type: ToastType };

const Ctx = createContext<{ show: (msg: string, type?: ToastType) => void }>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = useStyles();
  const { colors } = useTheme();

  const show = useCallback(
    (msg: string, type: ToastType = "info") => {
      setToast({ id: Date.now(), msg, type });
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [opacity],
  );

  const barColor =
    toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.brandSecondary;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]} testID="toast">
          <View style={[styles.toast, { borderColor: barColor }]}>
            <View style={[styles.bar, { backgroundColor: barColor }]} />
            <Text style={styles.text}>{toast.msg}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    paddingHorizontal: 24,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    maxWidth: 360,
    ...StyleSheet.flatten({
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    }),
  },
  bar: { width: 4, height: 20, borderRadius: 2 },
  text: { color: colors.onSurface, fontSize: 14, fontFamily: fonts.textSemiBold, flexShrink: 1, textAlign: "right" },
}));
