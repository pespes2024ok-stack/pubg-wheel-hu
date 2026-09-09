import { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { Icon, Img, RarityBadge, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/toast";

const STATUS = [
  { key: "pending", label: "قيد المعالجة", color: "#FF9800", icon: "clock-outline" },
  { key: "delivered", label: "تم التسليم", color: "#4CAF50", icon: "check-circle" },
  { key: "cancelled", label: "ملغاة", color: "#F44336", icon: "close-circle" },
];

export default function AdminOrders() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const listQ = useQuery({ queryKey: ["admin-rewards"], queryFn: () => api.get("/admin/rewards", true) });
  const data = (listQ.data || []).filter((r: any) => filter === "all" || r.status === filter);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.put(`/admin/rewards/${id}/status`, { status }, true);
      qc.invalidateQueries({ queryKey: ["admin-rewards"] });
      toast.show("تم تحديث الحالة", "success");
    } catch (e: any) { toast.show(e?.message || "تعذر التحديث", "error"); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="الطلبات والجوائز" onBack={() => router.back()} />
      <View style={styles.filterRow}>
        {[{ key: "all", label: "الكل" }, ...STATUS].map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterActive]} testID={`filter-${f.key}`}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      {listQ.isLoading ? <Loader /> : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
          ListEmptyComponent={<EmptyState icon="package-variant-closed" title="لا توجد طلبات" />}
          renderItem={({ item }) => {
            const rc = rarityColor(item.rarity, colors);
            return (
              <View style={[styles.card, { borderColor: rc + "55" }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.imgWrap, { borderColor: rc }]}><Img uri={item.image} style={styles.img} fallbackIcon="gift" /></View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.metaRow}>
                      <RarityBadge rarity={item.rarity} size="sm" />
                      <Text style={styles.src}>{item.source === "wheel" ? "العجلة" : "المتجر"}</Text>
                    </View>
                    <Text style={styles.order}>طلب #{item.order_number}</Text>
                    <Text style={styles.uid} numberOfLines={1}>المستخدم: {item.user_id}</Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  {STATUS.map((s) => {
                    const active = item.status === s.key;
                    return (
                      <Pressable key={s.key} onPress={() => setStatus(item.id, s.key)} style={[styles.statusBtn, active && { backgroundColor: s.color + "22", borderColor: s.color }]} testID={`status-${item.id}-${s.key}`}>
                        <Icon name={s.icon} size={14} color={active ? s.color : colors.muted} />
                        <Text style={[styles.statusText, active && { color: s.color }]}>{s.label}</Text>
                      </Pressable>
                    );
                  })}
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
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8, flexWrap: "wrap" },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  filterText: { color: colors.onSurfaceTertiary, fontSize: 12, fontFamily: fonts.textSemiBold },
  filterTextActive: { color: colors.onBrandPrimary },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  cardTop: { flexDirection: "row", gap: 12 },
  imgWrap: { width: 56, height: 56, borderRadius: 12, borderWidth: 1.5, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  src: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular },
  order: { color: colors.onSurfaceTertiary, fontSize: 12, fontFamily: fonts.displayMedium },
  uid: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular },
  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, paddingVertical: 9 },
  statusText: { color: colors.muted, fontSize: 11, fontFamily: fonts.textSemiBold },
}));
