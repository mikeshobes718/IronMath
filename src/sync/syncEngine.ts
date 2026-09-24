import type { SetEntry } from '../engine/log';
import type { BerthClient } from './berthClient';
import {
  mergeSections,
  mergeSets,
  type LocalSections,
  type SectionId,
  type SetRow,
  type StateRow,
} from './merge';

/** What the sync needs from wherever the data lives: the Zustand store on a phone, a plain object in a test. */
export interface LocalAdapter {
  read(): { log: SetEntry[]; tombstones: Record<string, number>; sections: LocalSections };
  apply(result: {
    log: SetEntry[];
    tombstones: Record<string, number>;
    sections: Partial<Record<SectionId, Record<string, unknown>>>;
    stamps: Record<SectionId, number>;
  }): void;
}

export interface SyncReport {
  pulledSets: number;
  pulledSections: number;
  pushedSets: number;
  pushedSections: number;
  localSets: number;
}

const SET_SELECT = 'entry_id,ts,lift_id,weight,unit,reps,rpe,deleted,changed_at';
const STATE_SELECT = 'section,data,changed_at';

/** Pull everything, merge newest-wins, write the merge to the phone, push what the server is missing. */
export async function syncOnce(client: BerthClient, local: LocalAdapter): Promise<SyncReport> {
  const [serverSets, serverState] = await Promise.all([
    client.listAll<SetRow>('lift_sets', SET_SELECT),
    client.listAll<StateRow>('user_state', STATE_SELECT),
  ]);
  const snapshot = local.read();
  const sets = mergeSets(snapshot.log, snapshot.tombstones, serverSets);
  const sections = mergeSections(snapshot.sections, serverState);

  local.apply({ log: sets.log, tombstones: sets.tombstones, sections: sections.apply, stamps: sections.stamps });

  await client.upsert('lift_sets', sets.push, 'owner_id,entry_id');
  await client.upsert('user_state', sections.push, 'owner_id,section');

  return {
    pulledSets: serverSets.length,
    pulledSections: serverState.length,
    pushedSets: sets.push.length,
    pushedSections: sections.push.length,
    localSets: sets.log.length,
  };
}
