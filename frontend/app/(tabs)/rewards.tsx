import { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { Icon, Img, RarityBadge, Loader, EmptyState } from "@/src/components/ui";

const STATUS_LABEL: Record<string, string> = { pending: "قيد المعالجة", delivered: "تم التسليم", cancelled: "ملغاة" };

export default function Rewards() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"all" | "wheel" | "store">("all");

  const rewardsQ = useQuery({ queryKey: ["rewards"], queryFn: () => api.get("/rewards") });
  const rewards = (rewardsQ.data || []).filter((r: any) => tab === "all" || r.source === tab);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>جوائزي</Text>
        <View style={styles.tabs}>
          {(["all", "wheel", "store"] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)} testID={`rewards-tab-${t}`}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "all" ? "الكل" : t === "wheel" ? "من العجلة" : "من المتجر"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {rewardsQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
          ListEmptyComponent={<EmptyState icon="treasure-chest-outline" title="لا توجد جوائز بعد" subtitle="أدر العجلة أو تسوق من المتجر لتربح جوائزك الأولى!" testID="rewards-empty" />}
          renderItem={({ item }) => {
            const rc = rarityColor(item.rarity, colors);
            const delivered = item.status === "delivered";
            return (
              <View style={[styles.row, { borderColor: rc + "55" }]} testID={`reward-${item.id}`}>
                <View style={[styles.imgWrap, { borderColor: rc }]}>
                  <Img uri={item.image} style={styles.img} fallbackIcon="gift-outline" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <RarityBadge rarity={item.rarity} size="sm" />
                    <View style={styles.sourceTag}>
                      <Icon name={item.source === "wheel" ? "ferris-wheel" : "storefront"} size={11} color={colors.muted} />
                      <Text style={styles.sourceText}>{item.source === "wheel" ? "العجلة" : "المتجر"}</Text>
                    </View>
                  </View>
                  <Text style={styles.order}>طلب #{item.order_number}</Text>
                </View>
                <View style={styles.statusCol}>
                  <View style={[styles.statusDot, { backgroundColor: delivered ? colors.success : colors.warning }]} />
                  <Text style={[styles.statusText, { color: delivered ? colors.success : colors.warning }]}>
                    {STATUS_LABEL[item.status] || item.status}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary },
  title: { color: colors.onSurface, fontSize: 24, fontFamily: fonts.textBold, marginBottom: 12 },
  tabs: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.textSemiBold },
  tabTextActive: { color: colors.onBrandPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, padding: 12 },
  imgWrap: { width: 56, height: 56, borderRadius: 12, borderWidth: 1.5, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sourceTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  sourceText: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular },
  order: { color: colors.muted, fontSize: 11, fontFamily: fonts.displayMedium },
  statusCol: { alignItems: "center", gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: fonts.textSemiBold },
}));
