import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, setUserToken, USER_TOKEN_KEY } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { registerForPush } from "@/src/push";

WebBrowser.maybeCompleteAuthSession();

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  points: number;
  referral_code: string;
  referrals_count: number;
  rewards_count: number;
  referral_applied: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

const AUTH_BASE = "https://auth.emergentagent.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const processed = useRef<Set<string>>(new Set());

  const persistToken = useCallback(async (token: string) => {
    setUserToken(token);
    if (Platform.OS === "web") {
      await storage.setItem(USER_TOKEN_KEY, token);
    } else {
      await storage.secureSet(USER_TOKEN_KEY, token);
    }
  }, []);

  const loadToken = useCallback(async () => {
    if (Platform.OS === "web") return await storage.getItem<string>(USER_TOKEN_KEY, "");
    return await storage.secureGet<string>(USER_TOKEN_KEY, "");
  }, []);

  const clearToken = useCallback(async () => {
    setUserToken(null);
    if (Platform.OS === "web") await storage.removeItem(USER_TOKEN_KEY);
    else await storage.secureRemove(USER_TOKEN_KEY);
  }, []);

  const exchangeSession = useCallback(
    async (sessionId: string) => {
      if (processed.current.has(sessionId)) return;
      processed.current.add(sessionId);
      const res = await api.post("/auth/session", { session_id: sessionId });
      await persistToken(res.session_token);
      setUser(res.user);
      registerForPush(res.user.user_id);
    },
    [persistToken],
  );

  const refresh = useCallback(async () => {
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch (e: any) {
      if (e?.status === 401) {
        await clearToken();
        setUser(null);
      }
    }
  }, [clearToken]);

  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        // 1. Web: session_id in url hash/search
        if (Platform.OS === "web") {
          const raw = window.location.href;
          const m = raw.match(/[?#&]session_id=([^&#]+)/);
          if (m) {
            await exchangeSession(decodeURIComponent(m[1]));
            const url = new URL(window.location.href);
            url.hash = "";
            url.searchParams.delete("session_id");
            window.history.replaceState(window.history.state, "", url.toString());
            setLoading(false);
            return;
          }
        } else {
          // Mobile: cold-start deep link
          const initial = await Linking.getInitialURL();
          if (initial) {
            const m = initial.match(/[?#&]session_id=([^&#]+)/);
            if (m) await exchangeSession(decodeURIComponent(m[1]));
          }
          sub = Linking.addEventListener("url", (e) => {
            const m = e.url.match(/[?#&]session_id=([^&#]+)/);
            if (m) exchangeSession(decodeURIComponent(m[1])).catch(() => {});
          });
        }

        // 2. Existing token
        const token = await loadToken();
        if (token) {
          setUserToken(token);
          await refresh();
        }
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, [exchangeSession, loadToken, refresh]);

  useEffect(() => {
    if (user) registerForPush(user.user_id);
  }, [user?.user_id]);

  const signIn = useCallback(async () => {
    const redirectUrl = Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
    const authUrl = `${AUTH_BASE}/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    let url: string | null = null;
    if (result.type === "success" && result.url) url = result.url;
    if (!url) url = await Linking.getInitialURL();
    if (url) {
      const m = url.match(/[?#&]session_id=([^&#]+)/);
      if (m) await exchangeSession(decodeURIComponent(m[1]));
    }
  }, [exchangeSession]);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await clearToken();
    setUser(null);
  }, [clearToken]);

  return <Ctx.Provider value={{ user, loading, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}
