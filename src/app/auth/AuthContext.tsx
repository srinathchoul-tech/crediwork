import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { signOutCurrentUser } from "../lib/auth";

type UserRole = "client" | "admin";

type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type SessionUser = Omit<AppUser, "password">;

type AuthContextValue = {
  user: SessionUser | null;
  signIn: (email: string, password: string, role: UserRole) => Promise<void>;
  signUp: (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  completeOAuthSignIn: (params: {
    role: UserRole;
    name: string;
    email: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const USERS_KEY = "cw_users";
const SESSION_KEY = "cw_session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readUsers(): AppUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(readSession());
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, role: UserRole) => {
      const users = readUsers();
      const matched = users.find(
        (entry) =>
          entry.email.toLowerCase() === email.toLowerCase() &&
          entry.password === password &&
          entry.role === role,
      );
      if (!matched) {
        throw new Error("Invalid email, password, or role.");
      }
      const session: SessionUser = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(session);
    },
    [],
  );

  const signUp = useCallback(
    async (params: { name: string; email: string; password: string; role: UserRole }) => {
      const users = readUsers();
      const normalizedEmail = params.email.trim().toLowerCase();
      const duplicate = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
      if (duplicate) {
        throw new Error(
          `This email is already registered as ${duplicate.role}. Use that role to sign in.`,
        );
      }

      const newUser: AppUser = {
        id: `local_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        name: params.name.trim(),
        email: normalizedEmail,
        password: params.password,
        role: params.role,
      };
      writeUsers([newUser, ...users]);

      const session: SessionUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(session);
    },
    [],
  );

  const completeOAuthSignIn = useCallback(
    async (params: { role: UserRole; name: string; email: string }) => {
      const users = readUsers();
      const normalizedEmail = params.email.trim().toLowerCase();
      let account = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

      if (account && account.role !== params.role) {
        throw new Error(
          `This email is already registered as ${account.role}. Use that role to sign in.`,
        );
      }

      if (!account) {
        account = {
          id: `local_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          name: params.name.trim() || normalizedEmail,
          email: normalizedEmail,
          password: "__oauth_google__",
          role: params.role,
        };
        writeUsers([account, ...users]);
      }

      const session: SessionUser = {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(session);
    },
    [],
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    await signOutCurrentUser();
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signUp, completeOAuthSignIn, signOut }),
    [user, signIn, signUp, completeOAuthSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
