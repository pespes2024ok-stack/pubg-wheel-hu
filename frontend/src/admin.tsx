import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { api, setAdminToken, ADMIN_TOKEN_KEY } from "@/src/api";
import { storage } from "@/src/utils/storage";

type AdminCtx = {
  authed: boolean;
  loading: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AdminCtx>({} as AdminCtx);
export const useAdmin = () => useContext(Ctx);

async function saveToken(token: string) {
  setAdminToken(token);
  if (Platform.OS === "web") await storage.setItem(ADMIN_TOKEN_KEY, token);
  else await storage.secureSet(ADMIN_TOKEN_KEY, token);
}
async function loadToken() {
  if (Platform.OS === "web") return await storage.getItem<string>(ADMIN_TOKEN_KEY, "");
  return await storage.secureGet<string>(ADMIN_TOKEN_KEY, "");
}
async function removeToken() {
  setAdminToken(null);
  if (Platform.OS === "web") await storage.removeItem(ADMIN_TOKEN_KEY);
  else await storage.secureRemove(ADMIN_TOKEN_KEY);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        setAdminToken(token);
        try {
          const me = await api.get("/admin/me", true);
          setEmail(me.email);
          setAuthed(true);
        } catch {
          await removeToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (em: string, password: string) => {
    const res = await api.post("/admin/login", { email: em, password });
    await saveToken(res.token);
    setEmail(res.email);
    setAuthed(true);
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    setAuthed(false);
    setEmail(null);
  }, []);

  return <Ctx.Provider value={{ authed, loading, email, login, logout }}>{children}</Ctx.Provider>;
}
