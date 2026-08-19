import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { productApi, type SessionUser } from "@/lib/product";
import { analytics } from "@/lib/analytics";

interface SessionValue {
  user: SessionUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: () => productApi.getSession(),
    staleTime: 30_000,
  });

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      productApi.signIn(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(["session"], user);
    },
  });

  const user = data ?? null;

  useEffect(() => {
    if (user) {
      analytics.identifyAccount({ accountId: user.accountId, userId: user.id });
      analytics.track("repeat_usage", { surface: "app" });
    }
  }, [user]);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      isLoading,
      signIn: (email, password) => signInMutation.mutateAsync({ email, password }),
      signOut: async () => {
        await productApi.signOut();
        queryClient.setQueryData(["session"], null);
        await queryClient.invalidateQueries();
      },
    }),
    [user, isLoading, signInMutation, queryClient],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}