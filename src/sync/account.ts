import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState as RNAppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAppStore, type AppState } from '../store/useAppStore';
import { BerthClient, BerthError, friendlyAuthError, type BerthSession, type SessionStore } from './berthClient';
import { BERTH_APP_URL, BERTH_PUBLISHABLE_KEY } from './config';
import {
  codeExpiryCopy,
  codeRemainingSec,
  normalizeEmail,
  passwordChecks,
  passwordIsAcceptable,
  passwordsMatch,
  RESET_SENT_COPY,
  type PasswordChecks,
} from './authCopy';
import { pickSection, SECTION_IDS, sectionFingerprint, type LocalSections, type SectionId, type SectionStamps } from './merge';
import { syncOnce, type LocalAdapter } from './syncEngine';

export {
  codeExpiryCopy,
  codeRemainingSec,
  normalizeEmail,
  passwordChecks,
  passwordIsAcceptable,
  passwordsMatch,
  RESET_SENT_COPY,
  type PasswordChecks,
};

const SESSION_KEY = 'ironmath.berth.session';

const secureSessionStore: SessionStore = {
  async load() {
    try {
      const raw =
        Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
      return raw ? (JSON.parse(raw) as BerthSession) : null;
    } catch {
      return null;
    }
  },
  async save(session) {
    if (Platform.OS === 'web') {
      await (session ? AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)) : AsyncStorage.removeItem(SESSION_KEY));
      return;
    }
    if (session) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  },
};

export const berth = new BerthClient(BERTH_APP_URL, BERTH_PUBLISHABLE_KEY, secureSessionStore);

type SyncStatus = 'idle' | 'syncing' | 'error';

interface AccountState {
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  lastSyncedAt: number | null;
  stamps: SectionStamps;
  status: SyncStatus;
  message: string | null;
}

export const useAccount = create<AccountState>()(
  persist(
    (): AccountState => ({
      signedIn: false,
      email: null,
      displayName: null,
      lastSyncedAt: null,
      stamps: {},
      status: 'idle',
      message: null,
    }),
    {
      name: 'ironmath-sync-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        signedIn: state.signedIn,
        email: state.email,
        displayName: state.displayName,
        lastSyncedAt: state.lastSyncedAt,
        stamps: state.stamps,
      }),
    }
  )
);

let applyingRemote = false;

function sameShape(current: unknown, next: unknown): boolean {
  if (Array.isArray(current) || Array.isArray(next)) {
    return Array.isArray(current) && Array.isArray(next);
  }
  if (current === null || next === null) {
    return current === next || current === undefined;
  }
  return typeof current === typeof next;
}

function sectionPatch(state: AppState, data: Record<string, unknown>, section: SectionId): Partial<AppState> {
  const patch: Record<string, unknown> = {};
  const current = pickSection(state, section);
  for (const key of Object.keys(current)) {
    const next = data[key];
    if (next === undefined || !sameShape(current[key], next)) {
      continue;
    }
    const was = current[key];
    if (was && typeof was === 'object' && !Array.isArray(was) && next && typeof next === 'object') {
      patch[key] = { ...(was as object), ...(next as object) };
    } else {
      patch[key] = next;
    }
  }
  if (section === 'gym' && Array.isArray(patch.gyms)) {
    const gyms = (patch.gyms as unknown[]).filter(
      (gym): gym is AppState['gyms'][number] =>
        Boolean(gym) && typeof gym === 'object' && typeof (gym as { id?: unknown }).id === 'string'
    );
    if (gyms.length === 0) {
      delete patch.gyms;
    } else {
      patch.gyms = gyms;
      const activeId = typeof patch.activeGymId === 'string' ? patch.activeGymId : state.activeGymId;
      if (!gyms.some((gym) => gym.id === activeId)) {
        patch.activeGymId = gyms[0].id;
      }
    }
  }
  return patch as Partial<AppState>;
}

const storeAdapter: LocalAdapter = {
  read() {
    const state = useAppStore.getState();
    const stamps = useAccount.getState().stamps;
    const sections = {} as LocalSections;
    for (const id of SECTION_IDS) {
      if (id === 'profile') {
        sections[id] = { data: { name: useAccount.getState().displayName ?? '' }, changedAt: stamps[id] ?? 0 };
      } else {
        sections[id] = { data: pickSection(state, id), changedAt: stamps[id] ?? 0 };
      }
    }
    return { log: state.log, tombstones: state.logTombstones, sections };
  },
  apply(result) {
    const state = useAppStore.getState();
    let patch: Partial<AppState> = { log: result.log, logTombstones: result.tombstones };
    let remoteName: string | null = null;
    for (const id of SECTION_IDS) {
      const data = result.sections[id];
      if (!data) {
        continue;
      }
      if (id === 'profile') {
        remoteName = typeof data.name === 'string' ? data.name.trim() : '';
        continue;
      }
      patch = { ...patch, ...sectionPatch(state, data, id) };
    }
    if (patch.restDurationSec !== undefined && !state.restRunning) {
      patch.restRemainingSec = patch.restDurationSec;
    }
    applyingRemote = true;
    try {
      useAppStore.setState(patch);
    } finally {
      applyingRemote = false;
    }
    useAccount.setState({
      stamps: result.stamps,
      ...(remoteName !== null ? { displayName: remoteName || null } : {}),
    });
  },
};

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const session = await berth.currentSession();
      if (!session) {
        useAccount.setState({ signedIn: false, status: 'idle' });
        return;
      }
      useAccount.setState({ signedIn: true, status: 'syncing', message: null });
      try {
        await syncOnce(berth, storeAdapter);
        useAccount.setState({ status: 'idle', lastSyncedAt: Date.now(), message: null });
      } catch (error) {
        if (error instanceof BerthError && error.code === 'signed_out') {
          useAccount.setState({
            signedIn: false,
            email: null,
            displayName: null,
            status: 'idle',
            message: 'Signed out. Sign in again to keep syncing.',
          });
          return;
        }
        useAccount.setState({ status: 'error', message: friendlyAuthError(error) });
        return;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (!useAccount.getState().signedIn) {
    return;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
  }
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, 2500);
}

function whenHydrated(store: { persist: { hasHydrated(): boolean; onFinishHydration(fn: () => void): () => void } }) {
  return new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) {
      resolve();
      return;
    }
    const off = store.persist.onFinishHydration(() => {
      off();
      resolve();
    });
  });
}

let started = false;

/** Called once at launch. Local data works the same whether or not this ever reaches the server. */
export async function startSync() {
  if (started) {
    return;
  }
  started = true;
  await Promise.all([whenHydrated(useAppStore), whenHydrated(useAccount)]);

  useAppStore.subscribe((state, prev) => {
    if (applyingRemote) {
      return;
    }
    let changed = state.log !== prev.log || state.logTombstones !== prev.logTombstones;
    const stamps: SectionStamps = { ...useAccount.getState().stamps };
    let stamped = false;
    for (const id of SECTION_IDS) {
      if (sectionFingerprint(state, id) !== sectionFingerprint(prev, id)) {
        stamps[id] = Date.now();
        stamped = true;
      }
    }
    if (stamped) {
      useAccount.setState({ stamps });
      changed = true;
    }
    if (changed) {
      schedulePush();
    }
  });

  RNAppState.addEventListener('change', (next) => {
    if (next === 'active') {
      void syncNow();
    }
  });

  const session = await berth.currentSession();
  if (session) {
    const name =
      typeof session.user.data?.name === 'string' && session.user.data.name.trim()
        ? session.user.data.name.trim()
        : useAccount.getState().displayName;
    useAccount.setState({ signedIn: true, email: session.user.email, displayName: name });
  } else if (useAccount.getState().signedIn) {
    useAccount.setState({ signedIn: false, email: null, displayName: null });
  }

  void syncNow();
}

async function afterSignIn(email: string | null, displayName?: string | null) {
  useAccount.setState({
    signedIn: true,
    email,
    displayName: displayName?.trim() || useAccount.getState().displayName,
    message: null,
  });
  await syncNow();
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const trimmedName = name.trim();
  const result = await berth.signUp(normalizeEmail(email), password, trimmedName ? { name: trimmedName } : undefined);
  if (!result.session || result.verificationRequired) {
    return { verificationRequired: true as const };
  }
  await afterSignIn(result.session.user.email, trimmedName || null);
  return { verificationRequired: false as const };
}

export async function signInWithEmail(email: string, password: string) {
  const result = await berth.signIn(normalizeEmail(email), password);
  if (!result.session || result.verificationRequired) {
    await berth.requestCode(normalizeEmail(email));
    return { verificationRequired: true as const, session: null };
  }
  const name = typeof result.session.user.data?.name === 'string' ? result.session.user.data.name : null;
  await afterSignIn(result.session.user.email, name);
  return { verificationRequired: false as const, session: result.session };
}

export async function requestSignInCode(email: string) {
  await berth.requestCode(normalizeEmail(email));
}

/** Always the same outcome to the caller when the address is simply unknown. */
export async function requestPasswordReset(email: string) {
  await berth.requestReset(normalizeEmail(email));
  return RESET_SENT_COPY;
}

export async function signInWithIdToken(
  provider: 'apple' | 'google',
  idToken: string,
  nonce: string | null,
  fullName?: string
) {
  const session = await berth.exchangeIdToken(provider, idToken, nonce, fullName);
  const fromToken = typeof session.user.data?.name === 'string' ? session.user.data.name : null;
  await afterSignIn(session.user.email, fullName?.trim() || fromToken);
  return session;
}

export async function verifySignInCode(email: string, code: string) {
  const session = await berth.verifyCode(normalizeEmail(email), code);
  const name = typeof session.user.data?.name === 'string' ? session.user.data.name : null;
  await afterSignIn(session.user.email, name);
  return session;
}

export async function updateDisplayName(name: string) {
  const trimmed = name.trim();
  await berth.updateMe({ data: { name: trimmed } });
  const stamps = { ...useAccount.getState().stamps, profile: Date.now() };
  useAccount.setState({ displayName: trimmed || null, stamps });
  await syncNow();
}

export async function changePassword(password: string) {
  await berth.updateMe({ password });
}

/** Local data stays on the phone. */
export async function signOut(everywhere = false) {
  await berth.signOut(everywhere);
  useAccount.setState({
    signedIn: false,
    email: null,
    displayName: null,
    lastSyncedAt: null,
    status: 'idle',
    message: null,
  });
}

/** Deletes the Berth user and every row they own. Local data stays on the phone. */
export async function deleteAccount() {
  await berth.deleteAccount();
  useAccount.setState({
    signedIn: false,
    email: null,
    displayName: null,
    lastSyncedAt: null,
    stamps: {},
    status: 'idle',
    message: null,
  });
}
