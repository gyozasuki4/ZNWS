import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "data", "generated", "base", "countries.geojson");

https.get(source, { headers: { "User-Agent": "ZASNet-Weather-Service" } }, (response) => {
  if (response.statusCode !== 200) throw new Error(`Natural Earth returned HTTP ${response.statusCode}`);
  let body = "";
  response.setEncoding("utf8");
  response.on("data", (chunk) => { body += chunk; });
  response.on("end", () => {
    const upstream = JSON.parse(body);
    const features = upstream.features || [];
    if (!features.length) throw new Error("No country boundaries were found in the Natural Earth source");
    const output = {
      type: "FeatureCollection",
      source: "Natural Earth 1:50m cultural vectors (public domain)",
      features: features.map((feature) => ({
        type: "Feature",
        properties: { name: feature.properties.NAME, isoA3: feature.properties.ADM0_A3 },
        geometry: feature.geometry
      }))
    };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(output));
    console.log(`Wrote ${destination} (${features.length} countries)`);
  });
}).on("error", (error) => { throw error; });
