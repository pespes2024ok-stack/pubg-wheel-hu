import { useMemo, useState } from "react";
import { View, Text, ScrollView, FlatList, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { GameButton, Icon, Img, RarityBadge, Coin, Loader, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/toast";
import { useLoginGate } from "@/src/login-gate";

export default function Store() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { promptLogin } = useLoginGate();
  const qc = useQueryClient();
  const [category, setCategory] = useState("الكل");
  const [selected, setSelected] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });
  const productsQ = useQuery({ queryKey: ["products"], queryFn: () => api.get("/store/products") });

  const categories = useMemo(() => {
    const cats = new Set<string>(["الكل"]);
    (productsQ.data || []).forEach((p: any) => cats.add(p.category || "أخرى"));
    return Array.from(cats);
  }, [productsQ.data]);

  const filtered = (productsQ.data || []).filter((p: any) => category === "الكل" || p.category === category);

  const buy = async () => {
    if (!selected) return;
    if (!user) {
      setSelected(null);
      promptLogin("سجّل الدخول لإتمام الشراء");
      return;
    }
    setBuying(true);
    try {
      await api.post(`/store/buy/${selected.id}`);
      toast.show(`تم شراء ${selected.name} بنجاح!`, "success");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      refresh();
    } catch (e: any) {
      toast.show(e?.message || "تعذر الشراء", "error");
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.storeTitle} numberOfLines={1}>{settings?.store_title || "متجر هيبة"}</Text>
            <Text style={styles.storeSub}>استبدل نقاطك بجوائز PUBG</Text>
          </View>
          {user ? (
            <View style={styles.pointsChip}>
              <Coin points={user?.points ?? 0} size={16} />
            </View>
          ) : (
            <Pressable style={styles.loginPill} onPress={() => promptLogin("سجّل الدخول لتجمع النقاط وتشتري")} testID="store-login-pill">
              <Icon name="login" size={14} color={colors.onBrandPrimary} />
              <Text style={styles.loginPillText}>دخول</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {categories.map((c) => {
            const active = c === category;
            return (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipActive]} testID={`cat-${c}`}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {productsQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 12 }}
          ListEmptyComponent={<EmptyState icon="package-variant" title="لا توجد منتجات" subtitle="يتم تجهيز المتجر، عد قريباً" testID="store-empty" />}
          renderItem={({ item }) => {
            const rc = rarityColor(item.rarity, colors);
            const affordable = (user?.points ?? 0) >= item.price_points;
            return (
              <Pressable style={[styles.card, { borderColor: rc + "88" }]} onPress={() => setSelected(item)} testID={`product-${item.id}`}>
                <View style={styles.imgWrap}>
                  <Img uri={item.image} style={styles.img} fallbackIcon="gift-outline" />
                  <LinearGradient colors={["transparent", "rgba(15,17,21,0.9)"]} style={styles.imgScrim} />
                  <View style={styles.badgePos}>
                    <RarityBadge rarity={item.rarity} size="sm" />
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <View style={styles.cardFooter}>
                  <Coin points={item.price_points} size={15} />
                  <View style={[styles.buyMini, !affordable && { opacity: 0.4 }]}>
                    <Icon name="cart-plus" size={16} color={colors.onBrandPrimary} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Buy modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            {selected ? (
              <>
                <View style={styles.sheetHandle} />
                <Img uri={selected.image} style={styles.sheetImg} fallbackIcon="gift-outline" />
                <View style={{ alignItems: "center", gap: 8, marginTop: 12 }}>
                  <RarityBadge rarity={selected.rarity} />
                  <Text style={styles.sheetTitle}>{selected.name}</Text>
                  {selected.description ? <Text style={styles.sheetDesc}>{selected.description}</Text> : null}
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>السعر</Text>
                    <Coin points={selected.price_points} size={20} />
                  </View>
                  {user ? <Text style={styles.balanceText}>رصيدك: {user?.points ?? 0} نقطة</Text> : <Text style={styles.balanceText}>سجّل الدخول لتشتري بالنقاط</Text>}
                </View>
                {!user ? (
                  <GameButton title="سجّل الدخول للشراء" icon="login" onPress={buy} testID="confirm-buy" style={{ alignSelf: "stretch", marginTop: 16 }} />
                ) : (
                  <GameButton
                    title={(user?.points ?? 0) >= selected.price_points ? "تأكيد الشراء" : "نقاطك غير كافية"}
                    icon="cart-check"
                    loading={buying}
                    disabled={(user?.points ?? 0) < selected.price_points}
                    onPress={buy}
                    testID="confirm-buy"
                    style={{ alignSelf: "stretch", marginTop: 16 }}
                  />
                )}
                <Pressable onPress={() => setSelected(null)} style={styles.cancel}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  storeTitle: { color: colors.onSurface, fontSize: 18, fontFamily: fonts.displayBold },
  storeSub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  pointsChip: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loginPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandPrimary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  loginPillText: { color: colors.onBrandPrimary, fontSize: 13, fontFamily: fonts.textBold },
  chipsScroll: { maxHeight: 56 },
  chipsRow: { gap: 8, paddingHorizontal: 16, alignItems: "center" },
  chip: { height: 36, flexShrink: 0, borderRadius: 999, paddingHorizontal: 16, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.textSemiBold },
  chipTextActive: { color: colors.onBrandPrimary },
  card: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 8 },
  imgWrap: { aspectRatio: 1, borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  img: { width: "100%", height: "100%" },
  imgScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 50 },
  badgePos: { position: "absolute", top: 6, left: 6 },
  cardTitle: { color: colors.onSurface, fontSize: 14, fontFamily: fonts.textBold, paddingHorizontal: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 2 },
  buyMini: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, alignItems: "center" },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 16 },
  sheetImg: { width: 160, height: 160, borderRadius: 16 },
  sheetTitle: { color: colors.onSurface, fontSize: 22, fontFamily: fonts.textBold, textAlign: "center" },
  sheetDesc: { color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "center", paddingHorizontal: 20 },
  priceBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },
  priceLabel: { color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular },
  balanceText: { color: colors.onSurfaceTertiary, fontSize: 13, fontFamily: fonts.textRegular },
  cancel: { alignSelf: "stretch", alignItems: "center", paddingVertical: 12 },
  cancelText: { color: colors.muted, fontSize: 14, fontFamily: fonts.textSemiBold },
}));
