import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/src/auth";
import { Loader } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";
import { SUBSCRIBED_KEY } from "@/src/constants";

export default function Index() {
  const { user, loading, guest } = useAuth();
  const [subChecked, setSubChecked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await storage.getItem<boolean>(SUBSCRIBED_KEY, false);
      setSubscribed(!!v);
      setSubChecked(true);
    })();
  }, []);

  if (loading || !subChecked) return <Loader />;
  if (user) return <Redirect href={subscribed ? "/(tabs)" : "/subscription"} />;
  if (guest) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}
