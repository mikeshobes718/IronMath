import { randomBytes } from 'node:crypto';
import { makeSetEntry, type SetEntry } from '../src/engine/log';
import { BerthClient, BerthError, type BerthSession, type SessionStore } from '../src/sync/berthClient';
import { BERTH_APP_URL, BERTH_PUBLISHABLE_KEY } from '../src/sync/config';
import { SECTION_IDS, type LocalSections, type SectionId } from '../src/sync/merge';
import { syncOnce, type LocalAdapter } from '../src/sync/syncEngine';

function memoryStore(): SessionStore {
  let session: BerthSession | null = null;
  return {
    load: async () => session,
    save: async (next) => {
      session = next;
    },
  };
}

function device(log: SetEntry[], sectionData: Partial<Record<SectionId, Record<string, unknown>>>, stamp: number) {
  const state = { log, tombstones: {} as Record<string, number>, sections: {} as LocalSections };
  for (const id of SECTION_IDS) {
    state.sections[id] = { data: sectionData[id] ?? {}, changedAt: sectionData[id] ? stamp : 0 };
  }
  const adapter: LocalAdapter = {
    read: () => state,
    apply(result) {
      state.log = result.log;
      state.tombstones = result.tombstones;
      for (const id of SECTION_IDS) {
        const data = result.sections[id];
        state.sections[id] = { data: data ?? state.sections[id].data, changedAt: result.stamps[id] };
      }
    },
  };
  return { state, adapter };
}

async function main() {
  const email = `ironmath-check-${Date.now()}@example.com`;
  const password = randomBytes(18).toString('base64url');
  const now = Date.now();

  const phoneA = new BerthClient(BERTH_APP_URL, BERTH_PUBLISHABLE_KEY, memoryStore());
  await phoneA.signUp(email, password);
  const a = device(
    [
      makeSetEntry({ id: 'check-1', ts: now - 3000, liftId: 'squat', weight: 140, unit: 'kg', reps: 5 }),
      makeSetEntry({ id: 'check-2', ts: now - 2000, liftId: 'bench', weight: 225, unit: 'lb', reps: 3, rpe: 8 }),
      makeSetEntry({ id: 'check-3', ts: now - 1000, liftId: 'deadlift', weight: 405, unit: 'lb', reps: 1 }),
    ],
    {
      settings: { unit: 'lb', rounding: 0, restDurationSec: 150 },
      club: { squat: '405', bench: '275', deadlift: '495', unit: 'lb' },
    },
    now
  );
  const write = await syncOnce(phoneA, a.adapter);
  console.log('write (phone A):', JSON.stringify(write));

  a.state.log = a.state.log.filter((entry) => entry.id !== 'check-3');
  a.state.tombstones = { 'check-3': Date.now() };
  const del = await syncOnce(phoneA, a.adapter);
  console.log('delete one set (phone A):', JSON.stringify(del));

  const phoneB = new BerthClient(BERTH_APP_URL, BERTH_PUBLISHABLE_KEY, memoryStore());
  await phoneB.signIn(email, password);
  const b = device([], {}, 0);
  const read = await syncOnce(phoneB, b.adapter);
  console.log('read (fresh phone B):', JSON.stringify(read));
  console.log(
    'phone B restored:',
    JSON.stringify({
      sets: b.state.log.map((entry) => `${entry.liftId} ${entry.weight}${entry.unit} x${entry.reps}`),
      unit: b.state.sections.settings.data.unit,
      restDurationSec: b.state.sections.settings.data.restDurationSec,
      club: b.state.sections.club.data,
      tombstones: Object.keys(b.state.tombstones),
    })
  );

  const serverSets = await phoneB.listAll<{ deleted: boolean }>('lift_sets', 'entry_id,deleted');
  const serverState = await phoneB.listAll<{ section: string }>('user_state', 'section');
  console.log(
    'server rows for this user:',
    JSON.stringify({
      lift_sets: serverSets.length,
      live: serverSets.filter((row) => !row.deleted).length,
      tombstones: serverSets.filter((row) => row.deleted).length,
      user_state: serverState.length,
    })
  );

  const session = await phoneB.currentSession();
  if (session) {
    session.expiresAt = Date.now() - 1000;
  }
  const refreshed = await phoneB.listAll<{ entry_id: string }>('lift_sets', 'entry_id');
  console.log('refresh then read:', refreshed.length);

  await phoneB.signOut(false);
  let afterLogout = 'still-in';
  try {
    await phoneB.listAll('lift_sets', 'entry_id');
  } catch (error) {
    afterLogout = error instanceof BerthError ? `refused ${error.status}` : 'refused';
  }
  console.log('logout then read:', afterLogout);

  await phoneB.signIn(email, password);
  await phoneA.signOut(true);
  let afterEverywhere = 'still-in';
  try {
    await phoneB.listAll('lift_sets', 'entry_id');
  } catch (error) {
    afterEverywhere = error instanceof BerthError ? `refused ${error.status}` : 'refused';
  }
  console.log('sign out everywhere then read:', afterEverywhere);

  await phoneA.signIn(email, password);

  const ok =
    b.state.log.length === 2 &&
    b.state.sections.settings.data.unit === 'lb' &&
    serverSets.length === 3 &&
    serverState.length === SECTION_IDS.length &&
    refreshed.length === 3 &&
    afterLogout.startsWith('refused') &&
    afterEverywhere.startsWith('refused');

  await phoneA.deleteAccount();
  let loginAfterDelete = 'succeeded';
  try {
    await phoneA.signIn(email, password);
  } catch (error) {
    loginAfterDelete = error instanceof BerthError ? `refused ${error.status}` : 'refused';
  }
  console.log('delete account: done, login afterwards', loginAfterDelete);
  console.log(ok && loginAfterDelete.startsWith('refused') ? 'RESULT: PASS' : 'RESULT: FAIL');
  process.exit(ok && loginAfterDelete.startsWith('refused') ? 0 : 1);
}

main().catch((error) => {
  console.error('RESULT: ERROR', error instanceof Error ? error.message : error);
  process.exit(1);
});
