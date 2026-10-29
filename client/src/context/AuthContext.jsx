import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

import {
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendCode,
  cognitoSignIn,
  cognitoCreatePennyPalSession,
  cognitoSignOut,
} from "../services/cognitoAuth.js";

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
  const completeCognitoLogin = async (idToken) => {
    const { user: u } = await api.post("/auth/cognito", { idToken });
    setUser(u);
    return u;
  };

  const loginWithCognito = async (username, password) => {
    const result = await cognitoSignIn(username, password);
    if (typeof result === "string") {
      return completeCognitoLogin(result);
    }
    return result;
  };

  const value = {
    user, loading, refresh, setUser,
    cognitoRegister: cognitoSignUp,
    cognitoConfirm: cognitoConfirmSignUp,
    cognitoResend: cognitoResendCode,
    cognitoLogin: loginWithCognito,
    cognitoCompleteLogin: async () =>
      completeCognitoLogin(await cognitoCreatePennyPalSession()),
    cognitoLogout: cognitoSignOut,
    login: (nickname, password) => start("/auth/login", { nickname, password }),
    register: (nickname, password) => start("/auth/register", { nickname, password }),
    demo: () => start("/auth/demo"),
    logout: async () => {
      try {
        await api.post("/auth/logout");
      } finally {
        setUser(null);
        await cognitoSignOut();
      }
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
