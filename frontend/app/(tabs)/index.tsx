import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Modal, ImageBackground, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { makeStyles, useTheme, fonts, rarityColor } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { GameButton, Icon, Img, RarityBadge, Coin, Loader } from "@/src/components/ui";
import { Sparks } from "@/src/components/sparks";
import { useBackgrounds, pickBackground } from "@/src/hooks";
import { useToast } from "@/src/toast";
import { useLoginGate } from "@/src/login-gate";
import LuckyWheel, { WheelHandle } from "@/src/components/wheel";

const { width } = Dimensions.get("window");
const WHEEL_SIZE = Math.min(width - 80, 320);

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { promptLogin } = useLoginGate();
  const qc = useQueryClient();
  const wheelRef = useRef<WheelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [remaining, setRemaining] = useState("");

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings") });
  const bgs = useBackgrounds();
  const homeBg = pickBackground(bgs.data, "home", settings?.home_background);
  const prizesQ = useQuery({ queryKey: ["wheel-prizes"], queryFn: () => api.get("/wheel/prizes") });
  const statusQ = useQuery({ queryKey: ["wheel-status"], queryFn: () => api.get("/wheel/status"), enabled: !!user });
  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: () => api.get("/notifications"), enabled: !!user });
  const subsQ = useQuery({ queryKey: ["subscriptions"], queryFn: () => api.get("/subscriptions"), enabled: !!user });

  const canSpin = statusQ.data?.can_spin;
  const unread = (notifQ.data || []).filter((n: any) => !n.read).length;

  useEffect(() => {
    if (canSpin || !statusQ.data?.next_spin_at) {
      setRemaining("");
      return;
    }
    const target = new Date(statusQ.data.next_spin_at).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining("");
        statusQ.refetch();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [canSpin, statusQ.data?.next_spin_at]);

  const onSpin = async () => {
    if (spinning) return;
    if (subsQ.data && !subsQ.data.all_done) {
      router.push("/subscribe-gate");
      return;
    }
    setSpinning(true);
    try {
      const res = await api.post("/wheel/spin");
      wheelRef.current?.spinTo(res.prize_index);
      // reveal result after animation
      setTimeout(() => {
        if (res.won && res.prize?.rarity === "legendary") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResult(res);
        setSpinning(false);
        qc.invalidateQueries({ queryKey: ["wheel-status"] });
        qc.invalidateQueries({ queryKey: ["rewards"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        refresh();
      }, 4700);
    } catch (e: any) {
      setSpinning(false);
      if (e?.status === 403 && e?.detail?.code === "subscription_required") {
        router.push("/subscribe-gate");
      } else if (e?.detail?.code === "cooldown") {
        toast.show("لقد استخدمت دورتك اليوم، عد غداً!", "info");
        statusQ.refetch();
      } else {
        toast.show(e?.message || "تعذر الدوران", "error");
      }
    }
  };

  if (prizesQ.isLoading) return <Loader />;

  return (
    <View style={styles.container}>
      <ImageBackground source={{ uri: homeBg || "" }} style={styles.bg}>
        <LinearGradient colors={["rgba(15,17,21,0.82)", "rgba(15,17,21,0.94)", colors.surface]} style={styles.overlay}>
          <Sparks count={16} />
          <ScrollView
            contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 18 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => { prizesQ.refetch(); statusQ.refetch(); refresh(); }} tintColor={colors.brandPrimary} />}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable style={styles.userChip} onPress={() => (user ? router.push("/(tabs)/profile") : promptLogin("سجّل الدخول لعرض ملفك"))}>
                <Img uri={user?.picture} style={styles.avatar} fallbackIcon="account" />
                <View>
                  <Text style={styles.hi}>{user ? "أهلاً بك" : "وضع الزائر"}</Text>
                  <Text style={styles.name} numberOfLines={1}>{user?.name || "زائر"}</Text>
                </View>
              </Pressable>
              <View style={styles.headerRight}>
                {user ? (
                  <View style={styles.pointsChip}>
                    <Coin points={user?.points ?? 0} size={16} />
                  </View>
                ) : (
                  <Pressable style={styles.loginPill} onPress={() => promptLogin("سجّل الدخول لتبدأ اللعب")} testID="header-login-pill">
                    <Icon name="login" size={14} color={colors.onBrandPrimary} />
                    <Text style={styles.loginPillText}>دخول</Text>
                  </Pressable>
                )}
                <Pressable style={styles.bell} onPress={() => (user ? router.push("/notifications") : promptLogin("سجّل الدخول لعرض الإشعارات"))} testID="notifications-button">
                  <Icon name="bell" size={22} color={colors.onSurface} />
                  {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View> : null}
                </Pressable>
              </View>
            </View>

            {/* Brand */}
            <View style={styles.brandRow}>
              <Icon name="crown" size={22} color={colors.brandSecondary} />
              <Text style={styles.brand}>هيبة</Text>
              <View style={styles.brandBadge}>
                <Icon name="fire" size={14} color={colors.brandSecondary} />
                <Text style={styles.brandBadgeText}>عجلة الحظ</Text>
              </View>
            </View>

            {/* Wheel */}
            <View style={styles.wheelWrap}>
              <View style={[styles.glow, { width: WHEEL_SIZE + 40, height: WHEEL_SIZE + 40, borderRadius: (WHEEL_SIZE + 40) / 2 }]} />
              <LuckyWheel ref={wheelRef} prizes={prizesQ.data || []} size={WHEEL_SIZE} />
            </View>

            {/* Spin CTA */}
            {!user ? (
              <GameButton title="أدر العجلة الآن" icon="ferris-wheel" onPress={() => promptLogin("سجّل الدخول لتدوير عجلة الحظ")} testID="spin-button" style={{ marginTop: 8 }} />
            ) : canSpin ? (
              <GameButton title="أدر العجلة الآن" icon="ferris-wheel" onPress={onSpin} loading={spinning} testID="spin-button" style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.cooldown} testID="cooldown-box">
                <Icon name="clock-outline" size={20} color={colors.brandSecondary} />
                <Text style={styles.cooldownText}>الدورة القادمة بعد</Text>
                <Text style={styles.cooldownTimer}>{remaining || "..."}</Text>
              </View>
            )}

            {/* Rarity legend */}
            <View style={styles.legend}>
              {[
                { k: "common", label: "عادية" },
                { k: "rare", label: "نادرة" },
                { k: "epic", label: "ملحمية" },
                { k: "legendary", label: "أسطورية" },
              ].map((r) => (
                <View key={r.k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: rarityColor(r.k, colors) }]} />
                  <Text style={styles.legendText}>{r.label}</Text>
                </View>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              <GridCard icon="storefront" title="متجر الجوائز" subtitle="اشترِ بالنقاط" color={colors.brandPrimary} onPress={() => router.push("/(tabs)/store")} testID="grid-store" />
              <GridCard icon="treasure-chest" title="جوائزي" subtitle="مقتنياتك" color={colors.brandSecondary} onPress={() => router.push("/(tabs)/rewards")} testID="grid-rewards" />
              <GridCard icon="account-multiple-plus" title="ادعُ أصدقاءك" subtitle="اربح نقاط" color={colors.success} onPress={() => router.push("/referrals")} testID="grid-referrals" />
              <GridCard icon="video-vintage" title="صناع المحتوى" subtitle="تابعهم" color={colors.info} onPress={() => router.push("/creators")} testID="grid-creators" />
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>

      {/* Result modal */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View style={styles.modalBg}>
          {result ? (
            <View style={[styles.resultCard, result.won && { borderColor: rarityColor(result.prize?.rarity, colors) }]} testID="spin-result">
              {result.won ? (
                <>
                  <View style={[styles.resultIcon, { backgroundColor: rarityColor(result.prize?.rarity, colors) + "22", borderColor: rarityColor(result.prize?.rarity, colors) }]}>
                    {result.prize?.image ? (
                      <Img uri={result.prize.image} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    ) : (
                      <Icon name="party-popper" size={48} color={rarityColor(result.prize?.rarity, colors)} />
                    )}
                  </View>
                  <Text style={styles.resultTitle}>مبروك! 🎉</Text>
                  <RarityBadge rarity={result.prize?.rarity || "common"} />
                  <Text style={styles.resultPrize}>{result.prize?.name}</Text>
                  <Text style={styles.resultSub}>
                    {result.prize?.kind === "points" ? "تمت إضافة النقاط إلى رصيدك" : "تمت إضافة الجائزة إلى مقتنياتك"}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.resultIcon}>
                    <Icon name="emoticon-sad-outline" size={48} color={colors.muted} />
                  </View>
                  <Text style={styles.resultTitle}>حظ أوفر!</Text>
                  <Text style={styles.resultSub}>لم تربح هذه المرة، عد غداً وحاول مجدداً</Text>
                </>
              )}
              <GameButton title="رائع" onPress={() => setResult(null)} testID="close-result" style={{ alignSelf: "stretch", marginTop: 18 }} />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function GridCard({ icon, title, subtitle, color, onPress, testID }: any) {
  const styles = useStyles();
  return (
    <Pressable style={styles.gridCard} onPress={onPress} testID={testID}>
      <View style={[styles.gridIcon, { backgroundColor: color + "22", borderColor: color }]}>
        <Icon name={icon} size={26} color={color} />
      </View>
      <Text style={styles.gridTitle}>{title}</Text>
      <Text style={styles.gridSub}>{subtitle}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  bg: { flex: 1, backgroundColor: colors.surface },
  overlay: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  userChip: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.brandPrimary },
  hi: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular },
  name: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold, maxWidth: 120 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  pointsChip: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  loginPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandPrimary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  loginPillText: { color: colors.onBrandPrimary, fontSize: 13, fontFamily: fonts.textBold },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.onError, fontSize: 10, fontFamily: fonts.displayBold },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8, marginBottom: 4 },
  brand: { color: colors.onSurface, fontSize: 34, fontFamily: fonts.textBold },
  brandBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.brandSecondary + "66", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  brandBadgeText: { color: colors.brandSecondary, fontSize: 12, fontFamily: fonts.textSemiBold },
  wheelWrap: { alignItems: "center", justifyContent: "center", marginVertical: 12 },
  glow: { position: "absolute", backgroundColor: colors.brandPrimary + "18" },
  cooldown: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  cooldownText: { color: colors.onSurfaceSecondary, fontSize: 14, fontFamily: fonts.textSemiBold },
  cooldownTimer: { color: colors.brandSecondary, fontSize: 18, fontFamily: fonts.displayBold },
  legend: { flexDirection: "row", justifyContent: "space-around", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: colors.onSurfaceSecondary, fontSize: 12, fontFamily: fonts.textSemiBold },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  gridCard: { flexBasis: "47.5%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, gap: 6 },
  gridIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  gridTitle: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  gridSub: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 32 },
  resultCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 24, borderWidth: 2, borderColor: colors.border, padding: 24, alignItems: "center", gap: 10, width: "100%", maxWidth: 340 },
  resultIcon: { width: 110, height: 110, borderRadius: 24, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  resultTitle: { color: colors.onSurface, fontSize: 24, fontFamily: fonts.textBold },
  resultPrize: { color: colors.brandSecondary, fontSize: 20, fontFamily: fonts.textBold, textAlign: "center" },
  resultSub: { color: colors.muted, fontSize: 13, fontFamily: fonts.textRegular, textAlign: "center" },
}));
