// `<private>/config.json` — remembers the shared space the user connected so the
// leaderboard re-opens it at boot without a prompt.
import { readJson, writeJson, type Store } from './store';

export interface ArcadeConfig {
  sharedSpaceId?: string;
  sharedName?: string;
}

const configPath = (store: Store): string => `${store.root}/config.json`;

export const readConfig = (store: Store): Promise<ArcadeConfig> =>
  readJson<ArcadeConfig>(configPath(store), {});

export async function writeConfig(store: Store, cfg: ArcadeConfig): Promise<void> {
  if (store.mode !== 'rw') return;
  await writeJson(configPath(store), cfg);
}
