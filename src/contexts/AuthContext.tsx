import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  
    // const checkUserRole = async (session: Session | null) => {
    //   if (!session?.user) {
    //     setSession(null);
    //     setUser(null);
    //     setLoading(false);
    //     return;
    //   }

    //   const { data: profileData, error } = await supabase
    //     .from("user_roles")
    //     .select("role")
    //     .eq("user_id", session.user.id)
    //     .single();

    //   if (error || !profileData || profileData.role !== "admin") {
    //     await supabase.auth.signOut();
    //     setSession(null);
    //     setUser(null);
    //     setLoading(false);
    //     return;
    //   }

    //   setSession(session);
    //   setUser(session.user);
    //   setLoading(false);
    // };

     const {
       data: { subscription },
     } = supabase.auth.onAuthStateChange((event, session) => {
       setSession(session);
       setUser(session?.user ?? null);
       setLoading(false);
     }); 


    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          signup_source: 'admin'
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data: AuthData, error: AuthError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (AuthError) {
      return { error: AuthError };
    }

    const { data: profileData, error: RoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", AuthData.user.id)
      .maybeSingle();

    if (RoleError) {
      await supabase.auth.signOut();
      return { error: RoleError };
    }

    // console.log(profileData);

    if (!profileData || profileData.role !== "admin") {
      await supabase.auth.signOut();
      return {
        error: { message: "You are not authorized for this role" } as Error,
      };
    }

    return { error: AuthError as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
