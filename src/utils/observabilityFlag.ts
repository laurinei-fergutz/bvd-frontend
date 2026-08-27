/**
 * In-memory mirror of the observability collection flag, readable from
 * instrumentFetch.ts (installed at startup, outside the React tree) without
 * a network round-trip per fetch call. SettingsContext is the source of
 * truth - it seeds this from the backend on load and keeps it in sync
 * whenever the user flips the Settings toggle.
 */
let enabled = true;

export function getObservabilityCollectionEnabled(): boolean {
  return enabled;
}

export function setObservabilityCollectionEnabled(value: boolean): void {
  enabled = value;
}
