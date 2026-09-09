import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { GameButton, Icon } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";
import { SUBSCRIBED_KEY } from "@/src/constants";

const PLANS = [
  { id: "monthly", title: "شهري", price: "٩٫٩٩$", period: "/شهر", perks: ["دورة إضافية يومياً", "جوائز حصرية", "شارة VIP"] },
  { id: "yearly", title: "سنوي", price: "٧٩٫٩٩$", period: "/سنة", perks: ["كل مزايا الشهري", "خصم ٣٣٪", "أولوية استلام الجوائز"], best: true },
];

export default function Subscription() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState("yearly");

  const proceed = async () => {
    await storage.setItem(SUBSCRIBED_KEY, true);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.crown}>
            <Icon name="crown" size={40} color={colors.brandSecondary} />
          </View>
          <Text style={styles.title}>هيبة VIP</Text>
          <Text style={styles.subtitle}>افتح تجربة الجوائز الكاملة وارتقِ في ساحة المعركة</Text>
        </View>

        <View style={styles.plans}>
          {PLANS.map((p) => {
            const active = selected === p.id;
            return (
              <Pressable key={p.id} testID={`plan-${p.id}`} onPress={() => setSelected(p.id)} style={[styles.plan, active && styles.planActive]}>
                {p.best ? (
                  <View style={styles.bestTag}>
                    <Text style={styles.bestText}>الأفضل</Text>
                  </View>
                ) : null}
                <View style={styles.planHead}>
                  <Text style={styles.planTitle}>{p.title}</Text>
                  <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{p.price}</Text>
                  <Text style={styles.period}>{p.period}</Text>
                </View>
                {p.perks.map((perk) => (
                  <View key={perk} style={styles.perk}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </Pressable>
            );
          })}
        </View>

        <LinearGradient colors={[colors.brandTertiary + "44", "transparent"]} style={styles.note}>
          <Icon name="information-outline" size={16} color={colors.brandSecondary} />
          <Text style={styles.noteText}>هذه شاشة اشتراك تجريبية — لن يتم خصم أي مبلغ.</Text>
        </LinearGradient>

        <GameButton title="اشترك الآن" icon="rocket-launch" onPress={proceed} testID="subscribe-button" style={{ marginTop: 20 }} />
        <Pressable onPress={proceed} style={styles.skip} testID="skip-subscription">
          <Text style={styles.skipText}>المتابعة لاحقاً</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: "center", marginTop: 24, marginBottom: 28 },
  crown: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { color: colors.onSurface, fontSize: 30, fontFamily: fonts.textBold },
  subtitle: { color: colors.muted, fontSize: 14, fontFamily: fonts.textRegular, textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  plans: { gap: 14 },
  plan: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 18 },
  planActive: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  bestTag: { position: "absolute", top: -1, left: 16, backgroundColor: colors.brandSecondary, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  bestText: { color: colors.onBrandSecondary, fontSize: 11, fontFamily: fonts.textBold },
  planHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 6 },
  planTitle: { color: colors.onSurface, fontSize: 20, fontFamily: fonts.textBold },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.brandPrimary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brandPrimary },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 12 },
  price: { color: colors.brandSecondary, fontSize: 30, fontFamily: fonts.displayBold },
  period: { color: colors.muted, fontSize: 14, fontFamily: fonts.textRegular, marginBottom: 5 },
  perk: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  perkText: { color: colors.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.textRegular },
  note: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, padding: 12, borderRadius: 12 },
  noteText: { color: colors.onSurfaceTertiary, fontSize: 12, fontFamily: fonts.textRegular, flexShrink: 1 },
  skip: { alignItems: "center", paddingVertical: 14 },
  skipText: { color: colors.muted, fontSize: 14, fontFamily: fonts.textSemiBold },
}));
