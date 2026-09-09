import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { makeStyles, useTheme, fonts } from "@/src/theme";
import { api } from "@/src/api";
import { Icon, ScreenHeader, Loader, EmptyState } from "@/src/components/ui";

export default function Notifications() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: () => api.get("/notifications") });

  const markRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      await api.post(`/notifications/${id}/read`);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="الإشعارات" onBack={() => router.back()} />
      {notifQ.isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={notifQ.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="bell-off-outline" title="لا توجد إشعارات" subtitle="ستظهر آخر الأخبار والعروض هنا" testID="notif-empty" />}
          renderItem={({ item }) => (
            <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => markRead(item.id, item.read)} testID={`notif-${item.id}`}>
              <View style={[styles.iconWrap, !item.read && { backgroundColor: colors.brandPrimary + "22", borderColor: colors.brandPrimary }]}>
                <Icon name="bell-ring" size={20} color={!item.read ? colors.brandPrimary : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString("ar")}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  rowUnread: { borderColor: colors.brandPrimary + "55" },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  title: { color: colors.onSurface, fontSize: 15, fontFamily: fonts.textBold },
  message: { color: colors.onSurfaceSecondary, fontSize: 13, fontFamily: fonts.textRegular, marginTop: 3, lineHeight: 19 },
  date: { color: colors.muted, fontSize: 11, fontFamily: fonts.textRegular, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandPrimary, marginTop: 4 },
}));
