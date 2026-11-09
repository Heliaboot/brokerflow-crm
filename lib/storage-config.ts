/**
 * Single source of truth for the prototype's localStorage persistence.
 *
 * Imported by BOTH lib/store.tsx (client store) and app/layout.tsx (inline
 * pre-hydration purge script), so the two can never drift out of sync.
 *
 * Bump STORE_VERSION whenever mock-data.ts or the stored state shape changes:
 * any saved data with a different version is discarded and fresh mock
 * defaults load on the next page load.
 */
export const STORAGE_KEY = "brokerflow_crm";
export const LEGACY_STORAGE_KEYS: string[] = [];
export const STORE_VERSION = 12;

/**
 * Inline script run in <body> before React hydrates. Removes saved data whose
 * __version does not match STORE_VERSION (or that cannot be parsed), plus any
 * legacy keys. Values are embedded via JSON.stringify so they stay in sync.
 */
export const PURGE_STALE_STORAGE_SCRIPT = `(function(){var k=${JSON.stringify(STORAGE_KEY)},v=${JSON.stringify(STORE_VERSION)},legacy=${JSON.stringify(LEGACY_STORAGE_KEYS)};function clear(){localStorage.removeItem(k);legacy.forEach(function(l){localStorage.removeItem(l);});}try{legacy.forEach(function(l){localStorage.removeItem(l);});var raw=localStorage.getItem(k);if(raw!==null&&JSON.parse(raw).__version!==v){clear();}}catch(e){try{clear();}catch(_){}}})();`;
