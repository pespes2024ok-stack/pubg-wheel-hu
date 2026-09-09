import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { useAdmin } from "@/src/admin";
import { Icon } from "@/src/components/ui";

const CARDS = [
  { route: "/admin/prizes", icon: "ferris-wheel", title: "جوائز العجلة", desc: "أضف وعدّل جوائز عجلة الحظ ونسب الفوز", color: "#FF5722" },
  { route: "/admin/products", icon: "storefront", title: "منتجات المتجر", desc: "منتجات المتجر والأسعار بالنقاط والكميات", color: "#FFC107" },
  { route: "/admin/orders", icon: "package-variant-closed", title: "الطلبات والجوائز", desc: "تابع وحدّث حالة جوائز المستخدمين", color: "#4CAF50" },
  { route: "/admin/notifications", icon: "bell-ring", title: "الإشعارات", desc: "أرسل إشعارات لجميع المستخدمين", color: "#607D8B" },
  { route: "/admin/creators", icon: "video-vintage", title: "صناع المحتوى", desc: "أضف قنوات وروابط صناع المحتوى", color: "#9C27B0" },
  { route: "/admin/backgrounds", icon: "image-multiple", title: "خلفيات التطبيق", desc: "أضف وغيّر واحذف خلفيات الشاشات", color: "#FF5722" },
  { route: "/admin/users", icon: "account-group", title: "المستخدمون", desc: "استعرض المستخدمين وعدّل نقاطهم", color: "#00BCD4" },
  { route: "/admin/settings", icon: "cog", title: "الإعدادات", desc: "اسم التطبيق، الشريط السفلي، الخلفيات، كلمة المرور", color: "#FF9800" },
];

export default function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, email } = useAdmin();

  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get("/admin/stats", true) });
  const s = statsQ.data || {};

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>لوحة التحكم</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
        <Pressable style={styles.logout} onPress={logout} testID="admin-logout">
          <Icon name="logout" size={20} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => statsQ.refetch()} tintColor={colors.brandPrimary} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={s.users ?? 0} label="مستخدم" icon="account" />
          <StatBox value={s.rewards ?? 0} label="جائزة" icon="trophy" />
          <StatBox value={s.pending_rewards ?? 0} label="قيد التسليم" icon="clock" highlight />
        </View>

        {/* Management cards */}
        <View style={{ gap: 12, marginTop: 8 }}>
          {CARDS.map((c) => (
            <Pressable key={c.route} style={styles.card} onPress={() => router.push(c.route as any)} testID={`admin-card-${c.route}`}>
              <View style={[styles.cardIcon, { backgroundColor: c.color + "22", borderColor: c.color }]}>
                <Icon name={c.icon} size={26} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
              </View>
              <Icon name="chevron-left" size={24} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ value, label, icon, highlight }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, highlight && { borderColor: colors.warning }]}>
      <Icon name={icon} size={20} color={highlight ? colors.warning : colors.brandSecondary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.onSurface, fontSize: 24, fontFamily: fonts.textBold },
  email: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular },
  logout: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.error + "18", borderWidth: 1, borderColor: colors.error + "55", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: "center", gap: 4 },
  statValue: { color: colors.onSurface, fontSize: 24, fontFamily: fonts.displayBold },
  statLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontFamily: fonts.textBold },
  cardDesc: { color: colors.muted, fontSize: 12, fontFamily: fonts.textRegular, marginTop: 2, lineHeight: 17 },
}));
