import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAmbassador, setIsAmbassador] = useState(false);
  const roleCache = useRef<Record<string, { admin: boolean; ambassador: boolean }>>({});
  const bootstrapped = useRef(false);

  const checkAdminRole = async (userId: string) => {
    if (roleCache.current[userId] !== undefined) {
      setIsAdmin(roleCache.current[userId].admin);
      setIsAmbassador(roleCache.current[userId].ambassador);
      return roleCache.current[userId].admin;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (data || []).map((r: any) => r.role);
    const adminFlag = roles.includes("admin");
    const ambassadorFlag = roles.includes("ambassador");
    roleCache.current[userId] = { admin: adminFlag, ambassador: ambassadorFlag };
    setIsAdmin(adminFlag);
    setIsAmbassador(ambassadorFlag);
    return adminFlag;
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await checkAdminRole(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setIsAmbassador(false);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!bootstrapped.current && event === "INITIAL_SESSION") {
        return;
      }

      void applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      bootstrapped.current = true;
      void applySession(existingSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    roleCache.current = {};
    // Note: do NOT remove "forti_2fa_trust" — it persists the trusted device
    // for 7 days across sign-outs, which is the whole point of "Remember this device"
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, isAmbassador, signIn, signUp, signOut };
};
