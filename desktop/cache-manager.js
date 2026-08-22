"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CACHE_VERSION = 1;
const DEFAULT_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
const TTL_MS = { radar: 4 * 60 * 60 * 1000, satellite: 6 * 60 * 60 * 1000, models: 24 * 60 * 60 * 1000, tiles: 30 * 24 * 60 * 60 * 1000 };
const WEATHER_CATEGORIES = new Set(["radar", "satellite", "models"]);
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;

function safeJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

class DesktopCacheManager {
  constructor(root, origin, fetcher, options = {}) {
    this.root = root;
    this.origin = origin;
    this.fetcher = fetcher;
    this.limitBytes = Number(options.limitBytes) || DEFAULT_LIMIT_BYTES;
    this.cacheRoot = path.join(root, "cache");
    this.metadataDir = path.join(this.cacheRoot, "metadata");
    this.indexFile = path.join(this.metadataDir, "index.json");
    this.index = safeJson(this.indexFile, { version: CACHE_VERSION, entries: {} });
    if (!this.index || this.index.version !== CACHE_VERSION || !this.index.entries) this.index = { version: CACHE_VERSION, entries: {} };
    this.stats = { memoryHits: 0, persistentHits: 0, networkMisses: 0, bytesRead: 0, bytesDownloaded: 0, bytesWritten: 0, evictions: 0, expired: 0, mapHits: 0, radarHits: 0, satelliteHits: 0, modelHits: 0 };
    this.memory = new Map();
    this.memoryBytes = 0;
    fs.mkdirSync(this.metadataDir, { recursive: true });
  }

  categoryFor(rawUrl) {
    let url;
    try { url = new URL(rawUrl, this.origin); } catch { return null; }
    if (url.origin !== this.origin || url.protocol !== "https:" && url.protocol !== "http:") return null;
    const p = url.pathname;
    if (/\/(?:radar|public\/radar)\//.test(p) || p.startsWith("/api/radar/")) return "radar";
    if (/\/(?:satellite|public\/satellite|lightning)\//.test(p) || p.startsWith("/api/satellite/")) return "satellite";
    if (p.startsWith("/api/public/models/") || p.startsWith("/api/forecast/") || p.includes("/models/")) return "models";
    if (p.startsWith("/data/generated/awips/") || p.startsWith("/data/generated/reference/") || p.startsWith("/api/public/maps/")) return p.startsWith("/api/public/maps/") ? "tiles" : "maps";
    return null;
  }

  keyFor(url) { return crypto.createHash("sha256").update(url).digest("hex"); }
  fileFor(category, key) { return path.join(this.cacheRoot, category, `${key}.bin`); }
  isPermanent(category) { return category === "maps"; }

  remember(key, entry, body) {
    if (body.length > MEMORY_LIMIT_BYTES) return;
    const existing = this.memory.get(key);
    if (existing) this.memoryBytes -= existing.body.length;
    this.memory.set(key, { ...entry, body, lastAccessAt: Date.now() });
    this.memoryBytes += body.length;
    while (this.memoryBytes > MEMORY_LIMIT_BYTES && this.memory.size) {
      const oldest = [...this.memory.entries()].sort((a, b) => a[1].lastAccessAt - b[1].lastAccessAt)[0][0];
      const removed = this.memory.get(oldest);
      this.memoryBytes -= removed.body.length;
      this.memory.delete(oldest);
    }
  }

  forgetCategory(categories) {
    for (const [key, entry] of this.memory.entries()) {
      if (categories.has(entry.category)) {
        this.memoryBytes -= entry.body.length;
        this.memory.delete(key);
      }
    }
  }

  persistIndex() {
    fs.mkdirSync(this.metadataDir, { recursive: true });
    const temp = `${this.indexFile}.tmp-${process.pid}`;
    fs.writeFileSync(temp, JSON.stringify(this.index), { mode: 0o600 });
    fs.renameSync(temp, this.indexFile);
  }

  async cacheFetch(rawUrl, init = {}) {
    const url = new URL(rawUrl, this.origin).toString();
    const category = this.categoryFor(url);
    // The renderer uses no-store for newest radar scans, health checks, and
    // other freshness-critical reads. Never let the persistent desktop cache
    // override that explicit request policy.
    if (!category || String(init.method || "GET").toUpperCase() !== "GET" || String(init.cache || "").toLowerCase() === "no-store") return null;
    const key = this.keyFor(url);
    const prior = this.index.entries[key];
    const now = Date.now();
    const hot = this.memory.get(key);
    if (hot && (hot.expiresAt === null || Number(hot.expiresAt) > now)) {
      hot.lastAccessAt = now;
      this.stats.memoryHits += 1;
      this.stats[`${category === "maps" ? "map" : category}Hits`] = (this.stats[`${category === "maps" ? "map" : category}Hits`] || 0) + 1;
      return { ok: true, status: hot.status, statusText: hot.statusText, headers: hot.headers || {}, body: hot.body.toString("base64"), cache: "memory" };
    }
    if (hot) {
      this.memoryBytes -= hot.body.length;
      this.memory.delete(key);
    }
    if (prior && (prior.expiresAt === null || Number(prior.expiresAt) > now) && fs.existsSync(prior.file)) {
      try {
        const body = fs.readFileSync(prior.file);
        if (prior.sha256 && crypto.createHash("sha256").update(body).digest("hex") !== prior.sha256) throw new Error("cache integrity mismatch");
        prior.lastAccessAt = now;
        this.stats.persistentHits += 1;
        this.stats[`${category === "maps" ? "map" : category}Hits`] = (this.stats[`${category === "maps" ? "map" : category}Hits`] || 0) + 1;
        this.stats.bytesRead += body.length;
        this.remember(key, prior, body);
        this.persistIndex();
        return { ok: true, status: prior.status, statusText: prior.statusText, headers: prior.headers || {}, body: body.toString("base64"), cache: "disk" };
      } catch { /* corrupted entries fall through to network */ }
    } else if (prior && prior.expiresAt !== null && Number(prior.expiresAt) <= now) {
      this.stats.expired += 1;
    }
    this.stats.networkMisses += 1;
    let response;
    try { response = await this.fetcher(url, { ...init, method: "GET" }); } catch (error) { return { error: error.message || "Network unavailable" }; }
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok) return { ok: false, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), body: body.toString("base64"), cache: "network" };
    const file = this.fileFor(category, key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, { mode: 0o600 });
    const headers = Object.fromEntries(response.headers);
    this.index.entries[key] = { url, category, file, size: body.length, sha256: crypto.createHash("sha256").update(body).digest("hex"), status: response.status, statusText: response.statusText, headers, createdAt: now, lastAccessAt: now, expiresAt: this.isPermanent(category) ? null : now + (TTL_MS[category] || TTL_MS.tiles) };
    this.remember(key, this.index.entries[key], body);
    this.stats.bytesDownloaded += body.length;
    this.stats.bytesWritten += body.length;
    this.persistIndex();
    void this.cleanup();
    return { ok: true, status: response.status, statusText: response.statusText, headers, body: body.toString("base64"), cache: "network" };
  }

  async cleanup() {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.index.entries)) {
      if (entry.expiresAt !== null && Number(entry.expiresAt) <= now) {
        try { fs.unlinkSync(entry.file); } catch {}
        this.stats.expired += 1;
        if (this.memory.has(key)) {
          this.memoryBytes -= this.memory.get(key).body.length;
          this.memory.delete(key);
        }
        delete this.index.entries[key];
      }
    }
    let total = Object.values(this.index.entries).reduce((sum, entry) => sum + Number(entry.size || 0), 0);
    if (total > this.limitBytes) {
      const candidates = Object.entries(this.index.entries).filter(([, entry]) => entry.expiresAt !== null).sort((a, b) => Number(a[1].lastAccessAt || 0) - Number(b[1].lastAccessAt || 0));
      for (const [key, entry] of candidates) {
        if (total <= this.limitBytes) break;
        try { fs.unlinkSync(entry.file); } catch {}
        total -= Number(entry.size || 0); delete this.index.entries[key]; this.stats.evictions += 1;
      }
    }
    this.persistIndex();
  }

  async clearWeather() {
    for (const [key, entry] of Object.entries(this.index.entries)) {
      if (WEATHER_CATEGORIES.has(entry.category)) { try { fs.unlinkSync(entry.file); } catch {} delete this.index.entries[key]; }
    }
    this.forgetCategory(WEATHER_CATEGORIES);
    this.persistIndex();
  }

  async clearTiles() {
    for (const [key, entry] of Object.entries(this.index.entries)) {
      if (entry.category === "tiles") { try { fs.unlinkSync(entry.file); } catch {} delete this.index.entries[key]; }
    }
    this.forgetCategory(new Set(["tiles"]));
    this.persistIndex();
  }

  statsSnapshot() {
    const categories = {};
    for (const entry of Object.values(this.index.entries)) {
      categories[entry.category] = (categories[entry.category] || 0) + Number(entry.size || 0);
    }
    return { root: this.cacheRoot, limitBytes: this.limitBytes, bytes: Object.values(categories).reduce((a, b) => a + b, 0), categories, entries: Object.keys(this.index.entries).length, stats: { ...this.stats } };
  }
}

module.exports = { DesktopCacheManager, CACHE_VERSION, DEFAULT_LIMIT_BYTES };
