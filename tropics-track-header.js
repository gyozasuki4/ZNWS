(() => {
  "use strict";
  const ns = "http://www.w3.org/2000/svg";
  const add = (parent, tag, attrs, value = "") => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, item]) => node.setAttribute(key, item));
    node.textContent = value;
    parent.append(node);
    return node;
  };
  const forecastTime = (feature, storm, index) => {
    const raw = `${feature?.properties?.name || ""} ${feature?.properties?.description || ""}`;
    const match = raw.match(/(\d{1,2})\s*\/\s*(\d{2})(\d{2})\s*Z/i);
    const base = new Date(storm.lastUpdate);
    let date;
    if (match) date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Number(match[1]), Number(match[2]), Number(match[3])));
    else date = new Date(base.getTime() + Number((raw.match(/(?:F|hour|hr)\s*0?(\d{1,3})/i) || [])[1] || index * 12) * 3_600_000);
    return date.toLocaleString([], { weekday:"short", hour:"numeric" });
  };
  const direction = (degrees) => {
    const value = Number(degrees);
    if (!Number.isFinite(value)) return "Not available";
    const points = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    return `${points[Math.round(value / 22.5) % 16]} · ${Math.round(value)}°`;
  };
  const advisoryStyle = (feature) => {
    const text = `${feature?.properties?.name || ""} ${feature?.properties?.description || ""}`.toLowerCase();
    if (text.includes("storm surge warning")) return { key:"ss-warning", label:"Storm surge warning", color:"#d381c3", dash:"" };
    if (text.includes("storm surge watch")) return { key:"ss-watch", label:"Storm surge watch", color:"#d381c3", dash:"7 5" };
    if (text.includes("hurricane warning")) return { key:"hu-warning", label:"Hurricane warning", color:"#ef6356", dash:"" };
    if (text.includes("hurricane watch")) return { key:"hu-watch", label:"Hurricane watch", color:"#ef6356", dash:"7 5" };
    if (text.includes("tropical storm warning")) return { key:"ts-warning", label:"Tropical storm warning", color:"#f1bd59", dash:"" };
    if (text.includes("tropical storm watch")) return { key:"ts-watch", label:"Tropical storm watch", color:"#f1bd59", dash:"7 5" };
    return { key:"advisory", label:"Tropical advisory", color:"#e8dfce", dash:"4 4" };
  };
  async function run() {
    const svg = document.querySelector("#coneMap svg");
    if (!svg) return setTimeout(run, 100);
    try {
      const id = new URLSearchParams(location.search).get("id") || "";
      const data = await fetch(`/api/public/tropics/storm?id=${encodeURIComponent(id)}`, { cache:"no-store" }).then((response) => response.json());
      const storm = data.storm;
      const points = (data.track?.features || []).filter((feature) => feature.geometry?.type === "Point");
      const cone = data.cone?.features || [];
      const coordinates = [[storm.longitudeNumeric, storm.latitudeNumeric], ...points.map((feature) => feature.geometry.coordinates)];
      cone.forEach((feature) => JSON.stringify(feature.geometry?.coordinates || []).match(/-?\d+(?:\.\d+)?/g)?.map(Number).forEach((value, index, values) => { if (index % 2 === 0) coordinates.push([value, values[index + 1]]); }));
      const xs = coordinates.map((point) => point[0]), ys = coordinates.map((point) => point[1]);
      const west = Math.min(...xs) - 4, east = Math.max(...xs) + 4, south = Math.min(...ys) - 4, north = Math.max(...ys) + 4;
      const project = ([longitude, latitude]) => [45 + (longitude - west) / (east - west) * 710, 445 - (latitude - south) / (north - south) * 360];
      const line = (items) => items.map((point, index) => { const [x,y] = project(point); return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("");
      const background = svg.querySelector("rect");
      if (background) background.setAttribute("fill", "#1d211d");
      const land = svg.querySelector("g[fill]");
      if (land) { land.setAttribute("fill", "#3a3c35"); land.setAttribute("stroke", "#10110f"); }
      svg.querySelectorAll('path[fill="#fff"]').forEach((cone) => { cone.setAttribute("fill-opacity", ".12"); cone.setAttribute("stroke-opacity", ".72"); cone.setAttribute("stroke-width", "1.5"); });
      svg.querySelectorAll('path[stroke="#f2bd3e"]').forEach((track) => { track.setAttribute("stroke", "#e2a84b"); track.setAttribute("stroke-width", "2.5"); });
      svg.querySelectorAll("text").forEach((node) => node.remove());
      svg.querySelectorAll("[data-modern-track-header]").forEach((node) => node.remove());
      const advisoryFeatures = [...(data.advisories?.wind?.features || []), ...(data.advisories?.surge?.features || [])].filter((feature) => ["LineString","Polygon","MultiLineString"].includes(feature.geometry?.type));
      const advisoryGroup = document.createElementNS(ns, "g");
      advisoryGroup.setAttribute("data-modern-track-header", "true");
      const activeStyles = new Map();
      advisoryFeatures.forEach((feature) => {
        const style = advisoryStyle(feature), geometry = feature.geometry;
        activeStyles.set(style.key, style);
        const segments = geometry.type === "LineString" ? [geometry.coordinates] : geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates[0]];
        const isArea = geometry.type === "Polygon";
        segments.forEach((segment) => add(advisoryGroup, "path", { d:`${line(segment)}${isArea ? "Z" : ""}`, fill:isArea ? style.color : "none", "fill-opacity":isArea ? ".16" : "0", stroke:style.color, "stroke-width":isArea ? "1" : "5", "stroke-linecap":"round", "stroke-linejoin":"round", "stroke-dasharray":style.dash, "paint-order":"stroke", "stroke-opacity":isArea ? ".48" : ".96" }));
      });
      if (storm.windWatchesWarnings && ![...activeStyles.keys()].some((key) => /^(?:hu|ts|wind)-/.test(key))) activeStyles.set("wind-active", { key:"wind-active", label:"Wind watch / warning active", color:"#f1bd59", dash:"7 5" });
      if (storm.stormSurgeWatchWarningGIS && ![...activeStyles.keys()].some((key) => key.startsWith("ss-"))) activeStyles.set("surge-active", { key:"surge-active", label:"Storm surge advisory active", color:"#d381c3", dash:"7 5" });
      svg.insertBefore(advisoryGroup, svg.querySelector(".forecast-point") || null);
      const header = add(svg, "g", { "data-modern-track-header":"true" });
      add(header, "rect", { width:800, height:90, fill:"#111210" });
      add(header, "rect", { y:86, width:800, height:4, fill:"#d39a42" });
      add(header, "text", { x:24, y:29, fill:"#f1ece2", "font-family":"Arial, sans-serif", "font-size":22, "font-weight":800 }, `${storm.name.toUpperCase()} · FORECAST TRACK`);
      add(header, "text", { x:776, y:27, fill:"#e2a84b", "font-family":"Arial, sans-serif", "font-size":11, "font-weight":800, "text-anchor":"end", "letter-spacing":"1" }, String(storm.classification || "ACTIVE CYCLONE").toUpperCase());
      const gust = storm.gusts ?? storm.gust ?? storm.maxGust;
      const updated = new Date(storm.lastUpdate);
      const stats = [
        [24, "SUSTAINED WIND", Number.isFinite(Number(storm.intensity)) ? `${storm.intensity} kt · ${Math.round(Number(storm.intensity) * 1.15078)} mph` : "Not available"],
        [180, "GUSTS", Number.isFinite(Number(gust)) ? `${gust} kt` : "Higher gusts"],
        [300, "PRESSURE", Number.isFinite(Number(storm.pressure)) ? `${storm.pressure} mb` : "Not available"],
        [420, "MOTION", `${direction(storm.movementDir)}${Number.isFinite(Number(storm.movementSpeed)) ? ` at ${storm.movementSpeed} mph` : ""}`],
        [610, "LAST UPDATED", Number.isFinite(updated.getTime()) ? updated.toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" }) : "Not available"]
      ];
      stats.forEach(([x, label, value], index) => {
        if (index) add(header, "path", { d:`M${Number(x) - 13} 43V79`, stroke:"#d8d2c5", "stroke-opacity":".15" });
        add(header, "text", { x, y:53, fill:"#817f77", "font-family":"Arial, sans-serif", "font-size":8, "font-weight":800, "letter-spacing":"1" }, label);
        add(header, "text", { x, y:72, fill:"#e5dfd4", "font-family":"Arial, sans-serif", "font-size":index === 3 || index === 4 ? 10 : 11, "font-weight":700 }, value);
      });
      const dots = [...svg.querySelectorAll(".forecast-point")];
      dots.forEach((dot, index) => {
        dot.setAttribute("r", "7");
        if (index !== 0 && index !== dots.length - 1 && index % 2 !== 0) return;
        const x = Number(dot.getAttribute("cx")), y = Number(dot.getAttribute("cy"));
        if (y < 102) return;
        const anchorRight = x < 610;
        const labelX = x + (anchorRight ? 14 : -14);
        const labelY = y + (index % 4 === 0 ? -11 : 17);
        add(svg, "text", { x:labelX, y:labelY, fill:"#f1ece2", "font-family":"Arial, sans-serif", "font-size":10.5, "font-weight":700, "text-anchor":anchorRight ? "start" : "end", "paint-order":"stroke", stroke:"#111210", "stroke-width":4 }, forecastTime(points[index], storm, index));
      });
      const current = [...svg.querySelectorAll("circle")].find((node) => node.getAttribute("r") === "10");
      if (current) add(svg, "text", { x:Number(current.getAttribute("cx")) + 15, y:Number(current.getAttribute("cy")) + 4, fill:"#f1ece2", "font-family":"Arial, sans-serif", "font-size":10, "font-weight":800, "letter-spacing":"1", "paint-order":"stroke", stroke:"#111210", "stroke-width":4 }, "CURRENT");
      const legendItems = [...activeStyles.values()];
      const legendHeight = 30 + Math.max(1, legendItems.length) * 18;
      const legend = add(svg, "g", { "data-modern-track-header":"true", transform:`translate(16 ${484 - legendHeight})` });
      add(legend, "rect", { width:218, height:legendHeight, rx:4, fill:"#111210", "fill-opacity":".92", stroke:"#d8d2c5", "stroke-opacity":".2" });
      add(legend, "text", { x:12, y:18, fill:"#817f77", "font-family":"Arial, sans-serif", "font-size":8, "font-weight":800, "letter-spacing":"1" }, "TROPICAL ADVISORIES");
      if (!legendItems.length) add(legend, "text", { x:12, y:38, fill:"#aaa89f", "font-family":"Arial, sans-serif", "font-size":10 }, "No coastal watches or warnings");
      legendItems.forEach((style, index) => { const y = 35 + index * 18; add(legend, "path", { d:`M12 ${y}H42`, stroke:style.color, "stroke-width":"4", "stroke-linecap":"round", "stroke-dasharray":style.dash }); add(legend, "text", { x:50, y:y + 4, fill:"#e5dfd4", "font-family":"Arial, sans-serif", "font-size":10, "font-weight":700 }, style.label); });
      const brand = add(svg, "g", { "data-modern-track-header":"true", transform:"translate(718 425)" });
      add(brand, "image", { href:"/ZNWS.png", width:54, height:54, opacity:".94", preserveAspectRatio:"xMidYMid slice" });
    } catch { /* The base map remains useful if decoration data is delayed. */ }
  }
  run();
})();
