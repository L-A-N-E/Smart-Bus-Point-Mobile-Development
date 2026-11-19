import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { t, tn } from '../i18n';
import { normalizeEmail, normalizeName, validateEmail, validateName, validatePassword } from '../utils/validation';

// Autenticação local (AsyncStorage) enquanto o backend não tem login.
// Senhas são guardadas como hash SHA-256 com salt aleatório por usuário, nunca em texto puro.
// Ainda é uma solução de protótipo: em produção, o login deve ir para o servidor.

export type User = {
  id: string;
  name: string;
  email: string;
  consentAt: string; // data/hora em que aceitou o uso de localização e dados locais (LGPD)
};

type StoredUser = User & { passwordHash: string; salt: string };

export type AuthResult = { ok: true } | { ok: false; error: string; field?: 'name' | 'email' | 'password' };

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string, consent: boolean) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const USERS_KEY = '@sbp:users';
const SESSION_KEY = '@sbp:session';
const ATTEMPTS_KEY = '@sbp:login-attempts';

export const DEMO_EMAIL = 'demo@sbp.com';
export const DEMO_PASSWORD = 'Sbp@2026';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

type Attempts = Record<string, { count: number; lockedUntil?: number }>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// expo-crypto só expõe digest de uma via (sem PBKDF2/scrypt/argon2 nativo) — encadeia várias
// rodadas de SHA-256 pra encarecer força bruta offline, já que um hash único é instantâneo de
// testar em GPU. Ainda não é memory-hard como scrypt/argon2; login real deve migrar pro backend.
const HASH_ROUNDS = 10_000;

async function hashPassword(password: string, salt: string) {
  let digest = `${salt}:${password}`;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}

async function withPassword(user: User, password: string): Promise<StoredUser> {
  const salt = Crypto.randomUUID();
  return { ...user, salt, passwordHash: await hashPassword(password, salt) };
}

async function verifyPassword(stored: StoredUser, password: string) {
  return (await hashPassword(password, stored.salt)) === stored.passwordHash;
}

async function loadUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  let users = raw ? (JSON.parse(raw) as StoredUser[]) : [];
  let changed = !raw;

  // Garante a conta de demonstração sempre disponível, com a senha atual.
  const demo = users.find((u) => u.id === 'demo');
  if (!demo) {
    const base: User = { id: 'demo', name: 'Conta de demonstração', email: DEMO_EMAIL, consentAt: new Date(0).toISOString() };
    users = [await withPassword(base, DEMO_PASSWORD), ...users];
    changed = true;
  }
  if (changed) await saveUsers(users);
  return users;
}

async function saveUsers(users: StoredUser[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function loadAttempts(): Promise<Attempts> {
  const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
  return raw ? (JSON.parse(raw) as Attempts) : {};
}

function toPublicUser({ id, name, email, consentAt }: StoredUser): User {
  return { id, name, email, consentAt };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [users, sessionId] = await Promise.all([loadUsers(), AsyncStorage.getItem(SESSION_KEY)]);
      const sessionUser = users.find((u) => u.id === sessionId);
      if (sessionUser) setUser(toPublicUser(sessionUser));
      setIsLoading(false);
    })();
  }, []);

  const signIn: AuthContextValue['signIn'] = async (rawEmail, password) => {
    const emailError = validateEmail(rawEmail);
    if (emailError) return { ok: false, error: emailError, field: 'email' };
    if (!password) return { ok: false, error: t('val.pw.required'), field: 'password' };

    const email = normalizeEmail(rawEmail);
    const attempts = await loadAttempts();
    const entry = attempts[email] ?? { count: 0 };
    if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
      const seconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      return { ok: false, error: t('auth.tooMany', { count: seconds }), field: 'password' };
    }

    const users = await loadUsers();
    const found = users.find((u) => u.email === email);
    const valid = found ? await verifyPassword(found, password) : false;

    if (!found || !valid) {
      const count = entry.count + 1;
      const locked = count >= MAX_ATTEMPTS;
      attempts[email] = locked ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count };
      await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
      // Mensagem genérica: não revela se o email existe.
      const remaining = MAX_ATTEMPTS - count;
      return {
        ok: false,
        field: 'password',
        error: locked
          ? t('auth.locked', { count: LOCK_MS / 1000 })
          : t('auth.wrong') + (remaining <= 2 ? tn('auth.remaining', remaining) : ''),
      };
    }

    delete attempts[email];
    await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    await AsyncStorage.setItem(SESSION_KEY, found.id);
    setUser(toPublicUser(found));
    return { ok: true };
  };

  const signUp: AuthContextValue['signUp'] = async (rawName, rawEmail, password, consent) => {
    // Revalida aqui também: a tela pode mudar, a regra não.
    const nameError = validateName(rawName);
    if (nameError) return { ok: false, error: nameError, field: 'name' };
    const emailError = validateEmail(rawEmail);
    if (emailError) return { ok: false, error: emailError, field: 'email' };
    const passwordError = validatePassword(password, { name: rawName, email: rawEmail });
    if (passwordError) return { ok: false, error: passwordError, field: 'password' };
    if (!consent) return { ok: false, error: t('register.consentRequired') };

    const users = await loadUsers();
    const email = normalizeEmail(rawEmail);
    if (users.some((u) => u.email === email)) {
      return { ok: false, error: t('auth.exists'), field: 'email' };
    }

    const newUser = await withPassword(
      { id: Crypto.randomUUID(), name: normalizeName(rawName), email, consentAt: new Date().toISOString() },
      password,
    );
    await saveUsers([...users, newUser]);
    await AsyncStorage.setItem(SESSION_KEY, newUser.id);
    setUser(toPublicUser(newUser));
    return { ok: true };
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  // LGPD: remove a conta e todos os dados locais associados a ela (favoritos, rotas salvas, preferências).
  const deleteAccount = async () => {
    if (!user) return;
    const users = await loadUsers();
    await saveUsers(users.filter((u) => u.id !== user.id));
    await AsyncStorage.multiRemove([SESSION_KEY, `@sbp:favorites:${user.id}`, `@sbp:saved-routes:${user.id}`]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
