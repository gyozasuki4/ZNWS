/**
 * Shared satellite loop catalog (Node + browser).
 * RealEarth CONUS products for animated timeline loops.
 * NESDIS merged GeoColor remains the archive loop for `geocolor`.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ZNCAVE_SAT_LOOP = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** @type {Record<string, { label: string, group: string, realEarth?: string, tileScheme: "xyz"|"export", loop?: boolean }>} */
  const SAT_LOOP_CATALOG = {
    // —— Visible ——
    abi01: {
      label: "Band 01 · Blue visible",
      group: "Visible",
      realEarth: "G19-ABI-CONUS-BAND01",
      tileScheme: "xyz",
      loop: true,
      enhance: "visible"
    },
    abi02: {
      label: "Band 02 · Red visible (0.5 km)",
      group: "Visible",
      realEarth: "G19-ABI-CONUS-BAND02",
      tileScheme: "xyz",
      loop: true,
      enhance: "visible"
    },
    abi03: {
      label: "Band 03 · Veggie",
      group: "Visible",
      realEarth: "G19-ABI-CONUS-BAND03",
      tileScheme: "xyz",
      loop: true,
      enhance: "visible"
    },
    truecolor: {
      label: "True Color RGB",
      group: "Visible",
      realEarth: "G19-ABI-CONUS-true-color",
      tileScheme: "xyz",
      loop: true
    },
    geocolorRe: {
      label: "GeoColor RGB · RealEarth CONUS",
      group: "Visible",
      realEarth: "G19-ABI-CONUS-geo-color",
      tileScheme: "xyz",
      loop: true
    },
    geocolor: {
      label: "Merged GeoColor · NESDIS archive",
      group: "Visible",
      tileScheme: "export",
      loop: true
    },

    // —— Near-IR / day ——
    abi04: {
      // RealEarth B04 is often nearly flat raw data; server stretches/fades solid slabs.
      label: "Band 04 · Cirrus (1.37 µm)",
      group: "Near-IR",
      realEarth: "G19-ABI-CONUS-BAND04",
      tileScheme: "xyz",
      loop: true,
      enhance: "cirrus"
    },
    abi05: {
      label: "Band 05 · Snow / ice",
      group: "Near-IR",
      realEarth: "G19-ABI-CONUS-BAND05",
      tileScheme: "xyz",
      loop: true,
      enhance: "cirrus"
    },
    abi06: {
      label: "Band 06 · Cloud particle size",
      group: "Near-IR",
      realEarth: "G19-ABI-CONUS-BAND06",
      tileScheme: "xyz",
      loop: true,
      enhance: "cirrus"
    },

    // —— Water vapor ——
    abi08: {
      label: "Band 08 · Upper-level water vapor",
      group: "Water vapor",
      realEarth: "G19-ABI-CONUS-BAND08-VAPR",
      tileScheme: "xyz",
      loop: true
    },
    abi09: {
      label: "Band 09 · Mid-level water vapor",
      group: "Water vapor",
      realEarth: "G19-ABI-CONUS-BAND09-VAPR",
      tileScheme: "xyz",
      loop: true
    },
    abi10: {
      label: "Band 10 · Low-level water vapor",
      group: "Water vapor",
      realEarth: "G19-ABI-CONUS-BAND10-VAPR",
      tileScheme: "xyz",
      loop: true
    },

    // —— IR / fire ——
    abi07: {
      label: "Band 07 · Shortwave IR / fire",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND07-FIRE",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },
    abi11: {
      label: "Band 11 · Cloud phase",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND11",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },
    abi12: {
      label: "Band 12 · Ozone",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND12",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },
    abi13: {
      label: "Band 13 · Clean IR",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND13-GRAD",
      tileScheme: "xyz",
      loop: true
    },
    abi14: {
      label: "Band 14 · Longwave IR",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND14",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },
    abi15: {
      label: "Band 15 · Dirty IR",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND15",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },
    abi16: {
      label: "Band 16 · CO₂ longwave IR",
      group: "Infrared",
      realEarth: "G19-ABI-CONUS-BAND16",
      tileScheme: "xyz",
      loop: true,
      enhance: "ir"
    },

    // —— RGB composites ——
    convection: {
      label: "Day Convection RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-convection",
      tileScheme: "xyz",
      loop: true
    },
    irSandwich: {
      label: "IR Sandwich RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-ir-sandwich",
      tileScheme: "xyz",
      loop: true
    },
    nightMicro: {
      label: "Night Microphysics RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-night-microphysics",
      tileScheme: "xyz",
      loop: true
    },
    dayMicro: {
      label: "Day Microphysics RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-day-microphysics-abi",
      tileScheme: "xyz",
      loop: true
    },
    airmass: {
      label: "Air Mass RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-airmass",
      tileScheme: "xyz",
      loop: true
    },
    dust: {
      label: "Dust RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-dust",
      tileScheme: "xyz",
      loop: true
    },
    fireTemp: {
      label: "Fire Temperature RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-fire-temperature-awips",
      tileScheme: "xyz",
      loop: true
    },
    snowFog: {
      label: "Day Snow-Fog RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-snow-fog",
      tileScheme: "xyz",
      loop: true
    },
    cloudPhase: {
      label: "Cloud Phase RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-cloud-phase",
      tileScheme: "xyz",
      loop: true
    },
    waterVaporRgb: {
      label: "Differential Water Vapor RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-water-vapors2",
      tileScheme: "xyz",
      loop: true
    },
    so2: {
      label: "SO₂ RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-so2",
      tileScheme: "xyz",
      loop: true
    },
    ash: {
      label: "Volcanic Ash RGB",
      group: "RGB composites",
      realEarth: "G19-ABI-CONUS-ash",
      tileScheme: "xyz",
      loop: true
    },

    // Legacy alias used in older map setups / layers radios
    animated: {
      label: "Merged GeoColor · NESDIS archive",
      group: "Visible",
      tileScheme: "export",
      loop: true
    }
  };

  function satLoopProductIds() {
    return Object.keys(SAT_LOOP_CATALOG).filter((id) => id !== "animated");
  }

  function normalizeSatLoopProductId(product) {
    const key = String(product || "").trim();
    if (SAT_LOOP_CATALOG[key]) return key === "animated" ? "geocolor" : key;
    const lower = key.toLowerCase();
    if (SAT_LOOP_CATALOG[lower]) return lower === "animated" ? "geocolor" : lower;
    return "";
  }

  function satLoopDefinition(product) {
    const id = normalizeSatLoopProductId(product);
    return id ? SAT_LOOP_CATALOG[id === "geocolor" && product === "animated" ? "geocolor" : id] : null;
  }

  function satLoopRealEarthId(product) {
    const def = satLoopDefinition(product);
    return def?.realEarth || "";
  }

  function satLoopTileScheme(product) {
    const def = satLoopDefinition(product);
    return def?.tileScheme === "export" ? "export" : "xyz";
  }

  /** Grouped options for <select> builders. */
  function satLoopOptionGroups() {
    const groups = new Map();
    satLoopProductIds().forEach((id) => {
      const def = SAT_LOOP_CATALOG[id];
      if (!def || def.loop === false) return;
      const group = def.group || "Other";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ id, label: def.label });
    });
    return [...groups.entries()].map(([group, options]) => ({ group, options }));
  }

  return {
    SAT_LOOP_CATALOG,
    satLoopProductIds,
    normalizeSatLoopProductId,
    satLoopDefinition,
    satLoopRealEarthId,
    satLoopTileScheme,
    satLoopOptionGroups
  };
});
