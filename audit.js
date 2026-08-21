const rows = document.querySelector("#auditRows");
const status = document.querySelector("#auditStatus");
const limit = document.querySelector("#auditLimit");
const search = document.querySelector("#auditSearch");
const eventFilter = document.querySelector("#auditEvent");
const pageFilter = document.querySelector("#auditPage");
const userFilter = document.querySelector("#auditUser");
const rangeFilter = document.querySelector("#auditRange");
const hideHeartbeats = document.querySelector("#hideHeartbeats");
const practiceOnly = document.querySelector("#practiceOnly");
const drawer = document.querySelector("#auditDrawer");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerBody = document.querySelector("#drawerBody");

let auditEntries = [];
let filteredEntries = [];
let selectedIndex = -1;
let searchTimer = null;

const EVENT_LABELS = {
  "warning-issued": "Warning issued",
  "system-warning-accepted": "Warning accepted",
  "page-view": "Page view",
  "page-exit": "Page exit",
  "tool-open": "Tool open",
  "login-start": "Login start",
  "login-success": "Login success",
  "login-failed": "Login failed",
  logout: "Logout",
  heartbeat: "Heartbeat",
  "audit-view": "Audit view",
  "audit-access-denied": "Audit denied",
  activity: "Activity"
};

const EVENT_TONE = {
  "warning-issued": "warning",
  "system-warning-accepted": "ok",
  "login-success": "ok",
  "login-failed": "danger",
  "audit-access-denied": "danger",
  logout: "muted",
  heartbeat: "muted",
  "page-view": "info",
  "page-exit": "muted",
  "tool-open": "info",
  "login-start": "info",
  "audit-view": "info"
};

const PAGE_LABELS = {
  "/": "Weather Ops",
  "/public.html": "Public map",
  "/audit.html": "Audit log"
};

const RANGE_MS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000
};

function cell(value, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (value instanceof Node) td.append(value);
  else td.textContent = value || "—";
  return td;
}

function stackCell(primary, secondary) {
  const wrap = document.createElement("div");
  wrap.className = "cell-stack";
  const top = document.createElement("span");
  top.className = "cell-primary";
  top.textContent = primary || "—";
  wrap.append(top);
  if (secondary) {
    const bot = document.createElement("span");
    bot.className = "cell-secondary";
    bot.textContent = secondary;
    wrap.append(bot);
  }
  return wrap;
}

function eventLabel(event) {
  return EVENT_LABELS[event] || String(event || "unknown").replace(/-/g, " ");
}

function eventBadge(event) {
  const span = document.createElement("span");
  span.className = `event-badge tone-${EVENT_TONE[event] || "neutral"}`;
  span.textContent = eventLabel(event);
  return span;
}

function clientIp(entry) {
  return entry.cloudflareClientIp
    || entry.proxyClientIp
    || String(entry.forwardedFor || "").split(",")[0].trim()
    || entry.peerIp
    || "";
}

function identity(entry) {
  if (entry.displayName && entry.username) return { name: entry.displayName, user: entry.username };
  if (entry.displayName) return { name: entry.displayName, user: "" };
  if (entry.username) return { name: entry.username, user: entry.username };
  return { name: "—", user: "" };
}

function formatUtcClock(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function formatRelative(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.round((now - t) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function formatDuration(seconds) {
  const n = Number(seconds);
  if (!n || n < 0) return "—";
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 48) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

function shortDevice(entry) {
  const ua = String(entry.userAgent || "");
  let browser = "";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (ua) browser = "Browser";

  let os = "";
  const platform = String(entry.platform || "");
  if (/Win/i.test(platform) || /Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(platform) || /Mac OS/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(platform) || /Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (platform) os = platform.split(" ")[0];

  const parts = [browser, os, entry.screen].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function pageLabel(page) {
  if (!page) return "—";
  return PAGE_LABELS[page] || page;
}

function warningParts(entry) {
  const product = entry.productId || entry.warningProduct || "";
  const action = entry.warningAction || "";
  const wfo = entry.warningWfo || "";
  const primary = [product, action].filter(Boolean).join(" · ") || "";
  const secondary = [wfo, entry.practice ? "practice" : ""].filter(Boolean).join(" · ");
  return { primary, secondary, product, action };
}

function warningCell(entry) {
  const td = document.createElement("td");
  const { primary, secondary, product, action } = warningParts(entry);
  if (!product) {
    td.textContent = primary || "—";
    return td;
  }
  const link = document.createElement("a");
  const params = new URLSearchParams({ productId: product });
  if (action) params.set("action", action);
  link.href = `/api/access/audit/warning-text?${params}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "warning-link";
  link.title = `Open stored warning text for ${product}`;
  const strong = document.createElement("strong");
  strong.textContent = primary;
  link.append(strong);
  if (secondary) {
    const small = document.createElement("small");
    small.textContent = secondary;
    link.append(small);
  }
  const open = document.createElement("small");
  open.className = "warning-open";
  open.textContent = "Open text ↗";
  link.append(open);
  td.append(link);
  return td;
}

function searchableText(entry) {
  const id = identity(entry);
  const groups = Array.isArray(entry.authentikGroups) ? entry.authentikGroups.join(" ") : "";
  return [
    entry.event,
    id.name,
    id.user,
    groups,
    entry.productId,
    entry.warningProduct,
    entry.warningAction,
    entry.warningWfo,
    entry.tool,
    entry.page,
    entry.referer,
    clientIp(entry),
    entry.peerIp,
    entry.forwardedFor,
    entry.country,
    entry.city,
    entry.region,
    entry.platform,
    entry.userAgent,
    entry.pageSessionId,
    entry.practice ? "practice" : ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function populateSelect(select, values, allLabel, labels = {}) {
  const current = select.value;
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.append(all);
  values.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = labels[value] || value;
    select.append(opt);
  });
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function rebuildFilterOptions() {
  const events = [...new Set(auditEntries.map((e) => e.event).filter(Boolean))].sort();
  const users = [...new Set(auditEntries.map((e) => e.username).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const pages = [...new Set(auditEntries.map((e) => e.page).filter(Boolean))].sort();

  const eventLabels = Object.fromEntries(events.map((e) => [e, eventLabel(e)]));
  const pageLabels = Object.fromEntries(pages.map((p) => [p, pageLabel(p)]));
  const userLabels = {};
  users.forEach((u) => {
    const hit = auditEntries.find((e) => e.username === u && e.displayName);
    userLabels[u] = hit?.displayName ? `${hit.displayName} (${u})` : u;
  });

  populateSelect(eventFilter, events, "All events", eventLabels);
  populateSelect(userFilter, users, "All users", userLabels);
  populateSelect(pageFilter, pages, "All pages", pageLabels);
}

function getFilteredEntries() {
  const query = search.value.trim().toLowerCase();
  const now = Date.now();
  const rangeMs = RANGE_MS[rangeFilter.value] || 0;
  const cutoff = rangeMs ? now - rangeMs : 0;

  return auditEntries.filter((entry) => {
    if (hideHeartbeats.checked && entry.event === "heartbeat") return false;
    if (practiceOnly.checked && !entry.practice) return false;
    if (eventFilter.value && entry.event !== eventFilter.value) return false;
    if (userFilter.value && entry.username !== userFilter.value) return false;
    if (pageFilter.value && (entry.page || "") !== pageFilter.value) return false;
    if (cutoff) {
      const t = new Date(entry.timestamp).getTime();
      if (Number.isNaN(t) || t < cutoff) return false;
    }
    if (query && !searchableText(entry).includes(query)) return false;
    return true;
  });
}

function updateSummary(entries) {
  const now = Date.now();
  const users = new Set(entries.map((e) => e.username).filter(Boolean));
  const sessions = new Set();
  const latestSessionEvents = new Map();
  auditEntries.forEach((entry) => {
    if (!entry.pageSessionId || !["page-view", "heartbeat", "page-exit"].includes(entry.event)) return;
    if (userFilter.value && entry.username !== userFilter.value) return;
    const time = new Date(entry.timestamp).getTime();
    if (Number.isNaN(time)) return;
    const current = latestSessionEvents.get(entry.pageSessionId);
    if (!current || time > current.time) latestSessionEvents.set(entry.pageSessionId, { event: entry.event, time });
  });
  latestSessionEvents.forEach(({ event, time }, sessionId) => {
    if (event !== "page-exit" && now - time <= 3 * 60 * 1000) sessions.add(sessionId);
  });

  document.querySelector("#entryCount").textContent = `${entries.length} / ${auditEntries.length}`;
  document.querySelector("#statWarnings").textContent = String(entries.filter((e) => e.event === "warning-issued").length);
  document.querySelector("#statFailedLogins").textContent = String(entries.filter((e) => e.event === "login-failed").length);
  document.querySelector("#statDenied").textContent = String(entries.filter((e) => e.event === "audit-access-denied").length);
  document.querySelector("#statUsers").textContent = String(users.size);
  document.querySelector("#statSessions").textContent = String(sessions.size);
}

function closeDrawer() {
  selectedIndex = -1;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
  rows.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
}

function fieldRow(label, value) {
  const row = document.createElement("div");
  row.className = "drawer-field";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  if (value instanceof Node) dd.append(value);
  else dd.textContent = value == null || value === "" ? "—" : String(value);
  row.append(dt, dd);
  return row;
}

function openDrawer(entry, index) {
  selectedIndex = index;
  rows.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
  const tr = rows.children[index];
  if (tr) tr.classList.add("is-selected");

  const id = identity(entry);
  drawerTitle.textContent = `${eventLabel(entry.event)} · ${id.name}`;
  drawerBody.replaceChildren();

  const actions = document.createElement("div");
  actions.className = "drawer-actions";
  if (entry.productId || entry.warningProduct) {
    const product = entry.productId || entry.warningProduct;
    const params = new URLSearchParams({ productId: product });
    if (entry.warningAction) params.set("action", entry.warningAction);
    const a = document.createElement("a");
    a.href = `/api/access/audit/warning-text?${params}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Open warning text ↗";
    actions.append(a);
  }
  if (actions.childNodes.length) drawerBody.append(actions);

  const dl = document.createElement("dl");
  dl.className = "drawer-fields";
  const groups = Array.isArray(entry.authentikGroups) && entry.authentikGroups.length
    ? entry.authentikGroups.join(", ")
    : "";

  [
    ["UTC time", formatUtcClock(entry.timestamp)],
    ["Relative", formatRelative(entry.timestamp)],
    ["Event", eventLabel(entry.event)],
    ["Display name", id.name],
    ["Username", id.user || entry.username || ""],
    ["Authentik UID", entry.authentikUid || ""],
    ["Groups", groups],
    ["Identity source", entry.identitySource || ""],
    ["Authenticated", entry.authenticated == null ? "" : String(entry.authenticated)],
    ["Page", entry.page ? `${pageLabel(entry.page)} (${entry.page})` : ""],
    ["Referer", entry.referer || ""],
    ["Tool", entry.tool || ""],
    ["Product ID", entry.productId || entry.warningProduct || ""],
    ["Warning action", entry.warningAction || ""],
    ["WFO", entry.warningWfo || ""],
    ["Practice", entry.practice ? "yes" : "no"],
    ["Client IP", clientIp(entry)],
    ["Cloudflare IP", entry.cloudflareClientIp || ""],
    ["Proxy client IP", entry.proxyClientIp || ""],
    ["Peer IP", entry.peerIp || ""],
    ["Forwarded-For", entry.forwardedFor || ""],
    ["Country", entry.country || ""],
    ["City", entry.city || ""],
    ["Region", entry.region || ""],
    ["Duration", formatDuration(entry.durationSeconds)],
    ["Page session", entry.pageSessionId || ""],
    ["Platform", entry.platform || ""],
    ["Screen", entry.screen || ""],
    ["Timezone", entry.timezone || ""],
    ["Language", entry.language || ""],
    ["User agent", entry.userAgent || ""]
  ].forEach(([label, value]) => {
    if (value === "" || value == null) return;
    dl.append(fieldRow(label, value));
  });

  drawerBody.append(dl);
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
}

function renderAudit() {
  const now = Date.now();
  filteredEntries = getFilteredEntries();
  rows.replaceChildren();

  filteredEntries.forEach((entry, index) => {
    const tr = document.createElement("tr");
    tr.dataset.index = String(index);
    if (entry.event === "heartbeat") tr.classList.add("row-heartbeat");
    if (entry.event === "warning-issued") tr.classList.add("row-warning");
    if (entry.event === "login-failed" || entry.event === "audit-access-denied") tr.classList.add("row-danger");
    if (entry.practice) tr.classList.add("row-practice");

    const id = identity(entry);
    const loc = [entry.city, entry.region, entry.country].filter(Boolean).join(", ") || "—";
    const activity = entry.tool || entry.warningAction || eventLabel(entry.event);
    const warnCell = warningCell(entry);

    tr.append(
      cell(stackCell(formatUtcClock(entry.timestamp).slice(11), formatRelative(entry.timestamp, now)), "col-time"),
      cell(eventBadge(entry.event), "col-event"),
      cell(stackCell(id.name, id.user && id.user !== id.name ? id.user : ""), "col-user"),
      warnCell,
      cell(clientIp(entry) || "—", "col-ip mono"),
      cell(loc, "col-loc"),
      cell(activity, "col-activity"),
      cell(formatDuration(entry.durationSeconds), "col-duration mono"),
      cell(stackCell(shortDevice(entry), entry.timezone || ""), "col-device"),
      cell(pageLabel(entry.page || ""), "col-page")
    );

    tr.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select")) return;
      openDrawer(entry, index);
    });

    rows.append(tr);
  });

  updateSummary(filteredEntries);

  if (selectedIndex >= 0 && selectedIndex < filteredEntries.length) {
    openDrawer(filteredEntries[selectedIndex], selectedIndex);
  } else if (selectedIndex >= 0) {
    closeDrawer();
  }

  if (!filteredEntries.length) {
    status.textContent = auditEntries.length
      ? "No records match the current filters."
      : "No access records loaded.";
  } else {
    const hiddenHb = hideHeartbeats.checked
      ? auditEntries.filter((e) => e.event === "heartbeat").length
      : 0;
    status.textContent = hiddenHb
      ? `Newest matching records first. Heartbeats hidden (${hiddenHb} in load). Click a row for full detail.`
      : "Newest matching records first. Click a row for full detail.";
  }
}

function escapeCsv(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCsv() {
  const entries = filteredEntries.length ? filteredEntries : getFilteredEntries();
  if (!entries.length) {
    status.textContent = "Nothing to export with current filters.";
    return;
  }
  const headers = [
    "timestamp", "event", "username", "displayName", "productId", "warningAction",
    "warningWfo", "practice", "clientIp", "country", "region", "city", "tool", "page",
    "durationSeconds", "platform", "screen", "timezone", "userAgent", "pageSessionId"
  ];
  const lines = [headers.join(",")];
  entries.forEach((e) => {
    const row = [
      e.timestamp,
      e.event,
      e.username,
      e.displayName,
      e.productId || e.warningProduct,
      e.warningAction,
      e.warningWfo,
      e.practice ? "true" : "false",
      clientIp(e),
      e.country,
      e.region,
      e.city,
      e.tool,
      e.page,
      e.durationSeconds,
      e.platform,
      e.screen,
      e.timezone,
      e.userAgent,
      e.pageSessionId
    ].map(escapeCsv);
    lines.push(row.join(","));
  });
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zive-access-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  status.textContent = `Exported ${entries.length} rows to CSV.`;
}

async function loadAudit({ silent = false } = {}) {
  status.classList.remove("error");
  if (!silent) status.textContent = "Loading access records…";
  try {
    const response = await fetch(`/api/access/audit?limit=${encodeURIComponent(limit.value)}`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (response.status === 403) throw new Error("Your Authentik account is not authorized to view this log.");
    if (!response.ok) throw new Error(`Audit request failed (HTTP ${response.status}).`);
    const data = await response.json();
    auditEntries = Array.isArray(data.entries) ? data.entries : [];
    document.querySelector("#refreshedAt").textContent =
      new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
    rebuildFilterOptions();
    renderAudit();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function scheduleRender() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderAudit, 120);
}

document.querySelector("#refreshAudit").addEventListener("click", loadAudit);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#drawerClose").addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

limit.addEventListener("change", loadAudit);
search.addEventListener("input", scheduleRender);
[eventFilter, pageFilter, userFilter, rangeFilter, hideHeartbeats, practiceOnly].forEach((control) => {
  control.addEventListener("change", renderAudit);
});

loadAudit();
window.setInterval(() => loadAudit({ silent: true }), 15_000);
