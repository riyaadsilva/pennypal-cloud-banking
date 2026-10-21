import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setUser((await api.get("/auth/me")).user); } catch { setUser(null); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const start = async (path, body) => { const { user: u } = await api.post(path, body); setUser(u); return u; };
  const value = {
    user, loading, refresh, setUser,
    login: (nickname, password) => start("/auth/login", { nickname, password }),
    register: (nickname, password) => start("/auth/register", { nickname, password }),
    demo: () => start("/auth/demo"),
    logout: async () => { await api.post("/auth/logout"); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
