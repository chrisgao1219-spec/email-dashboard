import * as api from './api';

const store = new Map();
const pending = new Map();
let staticDataUrl = null;
let staticDataUrls = {};
let generation = 0;
const STATIC_CACHE_PREFIX = 'email_dash_static_bundle_v1';
const STATIC_CACHE_TTL_MS = 5 * 60 * 1000;

async function getOrFetch(key, fetchFn) {
  if (store.has(key)) return store.get(key);
  if (pending.has(key)) return pending.get(key);

  const gen = generation;
  const promise = fetchFn()
    .then(data => {
      if (gen === generation) { store.set(key, data); }
      pending.delete(key);
      return data;
    })
    .catch(err => { pending.delete(key); throw err; });

  pending.set(key, promise);
  return promise;
}

export function setStaticDataUrl(url) { staticDataUrl = url; }
export function setStaticDataUrls(urls) { staticDataUrls = urls || {}; }

function getStaticCacheKey(url, brand) {
  return `${STATIC_CACHE_PREFIX}_${brand}_${encodeURIComponent(url)}`;
}

function readStaticBundle(url, brand, allowStale = false) {
  try {
    const entry = JSON.parse(localStorage.getItem(getStaticCacheKey(url, brand)) || 'null');
    if (!entry?.bundle) return null;
    if (!allowStale && Date.now() - entry.savedAt > STATIC_CACHE_TTL_MS) return null;
    return entry.bundle;
  } catch {
    return null;
  }
}

function saveStaticBundle(url, brand, bundle) {
  try {
    localStorage.setItem(getStaticCacheKey(url, brand), JSON.stringify({ savedAt: Date.now(), bundle }));
  } catch {
    // The app still works when a browser blocks storage or the bundle is too large.
  }
}

function unpackBundle(bundle, brand) {
  if (bundle.stats)     store.set('stats', bundle.stats);
  if (bundle.dashboard) store.set('dashboard', bundle.dashboard);
  if (bundle.subjects)  store.set('subjects', bundle.subjects);
  if (bundle.action)    store.set('action_' + brand, bundle.action);
  if (bundle.weekly)    store.set('weekly', bundle.weekly);
  if (bundle.compare)   { store.set('compare_弃购挽回', bundle.compare); }
  if (bundle.inspire)   { store.set('inspire_' + brand + '_弃购挽回', bundle.inspire); }
  if (bundle.copy)      store.set('copy', bundle.copy);
  if (bundle.templates) store.set('templates_' + brand, bundle.templates);
  if (bundle.config) {
    store.set('config', bundle.config);
    store.set('config_myBrands', bundle.config.myBrands);
  }
}

export function preloadAll(brand, force) {
  brand = brand || '';
  const url = staticDataUrls[brand] || staticDataUrl;

  if (url) {
    const cachedBundle = force ? null : readStaticBundle(url, brand);
    if (cachedBundle) {
      unpackBundle(cachedBundle, brand);
      return Promise.resolve(cachedBundle);
    }

    return fetch(url, { cache: force ? 'reload' : 'force-cache' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('static fetch failed')))
      .then(bundle => {
        saveStaticBundle(url, brand, bundle);
        return bundle;
      })
      .then(bundle => { unpackBundle(bundle, brand); return bundle; })
      .catch(() => {
        const staleBundle = readStaticBundle(url, brand, true);
        if (staleBundle) {
          unpackBundle(staleBundle, brand);
          return staleBundle;
        }
        return fetchBundleViaApi_(brand);
      });
  }

  return fetchBundleViaApi_(brand);
}

function fetchBundleViaApi_(brand) {
  return getOrFetch('bundle_' + brand, () => api.fetchBundle(brand))
    .then(bundle => { unpackBundle(bundle, brand); return bundle; });
}

export function invalidateAll() {
  generation++;
  store.clear();
  pending.clear();
}

export function invalidate(key) { store.delete(key); pending.delete(key); }

export function cachedFetch(key, fetchFn) {
  return getOrFetch(key, fetchFn);
}
