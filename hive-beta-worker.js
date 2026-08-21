"use strict";

self.addEventListener("message", async (event) => {
  const { id, type, url } = event.data || {};
  if (!id) return;
  try {
    if (type === "json" && typeof url === "string") {
      const response = await fetch(url, { cache: "force-cache", credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Parsing happens off the UI thread. Structured cloning the finished
      // object is substantially less disruptive than parsing multi-MB GeoJSON.
      const value = JSON.parse(await response.text());
      self.postMessage({ id, ok: true, value });
      return;
    }
    if (type === "radarMesh") {
      const value = buildRadarMesh(event.data);
      self.postMessage({ id, ok: true, value }, [value.positions, value.colors]);
      return;
    }
    throw new Error("Unsupported beta worker job");
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
});

function rgb(color) {
  if (Array.isArray(color)) return color.map(Number).slice(0, 3);
  const text = String(color || "");
  const functional = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
  if (functional) return functional.slice(1, 4).map(Number);
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) return [0, 2, 4].map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16));
  return [255, 255, 255];
}

function sampleColor(table, value) {
  if (!table?.length) return [1, 1, 1, 0.9];
  if (value <= table[0].value) {
    const color = rgb(table[0].color);
    return [color[0] / 255, color[1] / 255, color[2] / 255, 0.92];
  }
  if (value >= table.at(-1).value) {
    const last = table.at(-1), color = rgb(last.endColor || last.color);
    return [color[0] / 255, color[1] / 255, color[2] / 255, 0.92];
  }
  for (let index = 0; index < table.length - 1; index += 1) {
    const left = table[index], right = table[index + 1];
    if (value < left.value || value > right.value) continue;
    const start = rgb(left.color), end = rgb(left.endColor || right.color);
    const amount = Math.min(1, Math.max(0, (value - left.value) / Math.max(right.value - left.value, 1e-6)));
    return [
      (start[0] + (end[0] - start[0]) * amount) / 255,
      (start[1] + (end[1] - start[1]) * amount) / 255,
      (start[2] + (end[2] - start[2]) * amount) / 255,
      0.92
    ];
  }
  const color = rgb(table[0].color);
  return [color[0] / 255, color[1] / 255, color[2] / 255, 0.92];
}

function azimuthEdges(azimuths, maxGapDeg) {
  const count = azimuths.length;
  if (!count) return { edges: [], valid: [] };
  if (count === 1) return { edges: [[azimuths[0] - 0.25, azimuths[0] + 0.25]], valid: [true] };
  const steps = [];
  for (let index = 0; index < count - 1; index += 1) {
    let step = azimuths[index + 1] - azimuths[index];
    if (step < 0) step += 360;
    steps.push(step);
  }
  let wrap = azimuths[0] + 360 - azimuths[count - 1];
  if (wrap < 0) wrap += 360;
  steps.push(wrap);
  const sorted = steps.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0.5;
  const limit = Math.max(maxGapDeg || 2.5, median * 2.5);
  const edges = new Array(count), valid = new Array(count).fill(true);
  for (let index = 0; index < count; index += 1) {
    const previous = azimuths[(index - 1 + count) % count];
    const current = azimuths[index], next = azimuths[(index + 1) % count];
    let back = current - previous, forward = next - current;
    if (back < 0) back += 360;
    if (forward < 0) forward += 360;
    if (back > limit && forward > limit) {
      valid[index] = false;
      edges[index] = [current - median / 2, current + median / 2];
      continue;
    }
    edges[index] = [current - (back > limit ? median / 2 : back / 2), current + (forward > limit ? median / 2 : forward / 2)];
  }
  return { edges, valid };
}

function destination(lon, lat, azimuth, rangeKm) {
  const bearing = azimuth * Math.PI / 180, lat1 = lat * Math.PI / 180, lon1 = lon * Math.PI / 180;
  const angular = rangeKm / 6371;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
}

function mercator([lon, lat]) {
  const limitedLat = Math.max(-85.051129, Math.min(85.051129, lat));
  const x = (lon + 180) / 360;
  const y = (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + limitedLat * Math.PI / 360)))) / 360;
  return [x, y];
}

function buildRadarMesh(data) {
  const bytes = new Uint8Array(data.bytes), azimuths = data.azimuths || [];
  const gates = data.gateCount | 0, encoding = data.encoding || { vmin: -30, vmax: 80, nodata: 0 };
  const { edges, valid } = azimuthEdges(azimuths, data.maxRayGapDeg);
  let acceptedCount = 0;
  for (let ray = 0; ray < azimuths.length; ray += 1) {
    if (!valid[ray]) continue;
    for (let gate = 0; gate < gates; gate += 1) {
      const byte = bytes[ray * gates + gate];
      if (!byte || byte === encoding.nodata) continue;
      const value = encoding.vmin + ((byte - 1) / 254) * (encoding.vmax - encoding.vmin);
      if (!Number.isFinite(value) || (data.minDisplay != null && value < data.minDisplay)) continue;
      acceptedCount += 1;
    }
  }
  const positions = new Float32Array(acceptedCount * 12);
  const colors = new Uint8Array(acceptedCount * 24);
  let p = 0, c = 0;
  for (let ray = 0; ray < azimuths.length; ray += 1) {
    if (!valid[ray]) continue;
    for (let gate = 0; gate < gates; gate += 1) {
      const byte = bytes[ray * gates + gate];
      if (!byte || byte === encoding.nodata) continue;
      const value = encoding.vmin + ((byte - 1) / 254) * (encoding.vmax - encoding.vmin);
      if (!Number.isFinite(value) || (data.minDisplay != null && value < data.minDisplay)) continue;
      const r0 = Math.max(0, data.firstGateKm + (gate - 0.5) * data.gateWidthKm);
      const r1 = Math.max(r0, data.firstGateKm + (gate + 0.5) * data.gateWidthKm);
      const az0 = edges[ray][0], az1 = edges[ray][1];
      const m00 = mercator(destination(data.radarLon, data.radarLat, az0, r0));
      const m10 = mercator(destination(data.radarLon, data.radarLat, az1, r0));
      const m11 = mercator(destination(data.radarLon, data.radarLat, az1, r1));
      const m01 = mercator(destination(data.radarLon, data.radarLat, az0, r1));
      for (const point of [m00, m10, m11, m00, m11, m01]) {
        positions[p++] = point[0]; positions[p++] = point[1];
      }
      const color = sampleColor(data.colorTable, value);
      for (let vertex = 0; vertex < 6; vertex += 1) {
        colors[c++] = Math.round(color[0] * 255); colors[c++] = Math.round(color[1] * 255); colors[c++] = Math.round(color[2] * 255); colors[c++] = Math.round(color[3] * 255);
      }
    }
  }
  return { positions: positions.buffer, colors: colors.buffer, vertexCount: acceptedCount * 6 };
}
