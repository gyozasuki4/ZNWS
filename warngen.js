/**
 * ZNCave WarnGen engine — geometry, UGC, motion, location phrasing.
 * MapLibre-agnostic; app.js owns map interaction.
 */
(function (global) {
  "use strict";

  /**
   * WFO → IANA timezone (handles EST/EDT, CST/CDT, etc. via Intl).
   * Unknown WFOs still get a zone via getOffice() defaults, not hardcoded CDT.
   */
  /** Full WFO→IANA map derived from AWIPS public-zone TIME_ZONE majority (with special-case overrides). */
  const WFO_IANA = {
    ABQ: "America/Denver", // Albuquerque NM · zones M 41/41
    ABR: "America/Chicago", // Aberdeen SD · zones C 26/28
    AFC: "America/Anchorage", // Anchorage AK · zones A 49/51
    AFG: "America/Anchorage", // Fairbanks AK · zones A 52/52
    AJK: "America/Juneau", // Juneau AK · zones A 16/16
    AKQ: "America/New_York", // Wakefield VA · zones E 96/96
    ALY: "America/New_York", // Albany NY · zones E 34/34
    AMA: "America/Chicago", // Amarillo TX · zones C 24/24
    APX: "America/Detroit", // Gaylord MI · zones E 30/30
    ARX: "America/Chicago", // La Crosse WI · zones C 28/28
    BGM: "America/New_York", // Binghamton NY · zones E 26/26
    BIS: "America/Chicago", // Bismarck ND · zones C 32/40
    BMX: "America/Chicago", // Birmingham AL · zones C 39/39
    BOI: "America/Boise", // Boise ID · zones M 12/14
    BOU: "America/Denver", // Denver CO · zones M 22/22
    BOX: "America/New_York", // Boston/Norton MA · zones E 35/35
    BRO: "America/Chicago", // Brownsville TX · zones C 15/15
    BTV: "America/New_York", // Burlington VT · zones E 26/26
    BUF: "America/New_York", // Buffalo NY · zones E 17/17
    BYZ: "America/Denver", // Billings MT · zones M 31/31
    CAE: "America/New_York", // Columbia SC · zones E 26/26
    CAR: "America/New_York", // Caribou ME · zones E 15/15
    CHS: "America/New_York", // Charleston SC · zones E 27/27
    CLE: "America/New_York", // Cleveland OH · zones E 32/32
    CRP: "America/Chicago", // Corpus Christi TX · zones C 24/24
    CTP: "America/New_York", // State College PA · zones E 36/36
    CYS: "America/Denver", // Cheyenne WY · zones M 28/28
    DDC: "America/Chicago", // Dodge City KS · zones C 26/27
    DLH: "America/Chicago", // Duluth MN · zones C 23/23
    DMX: "America/Chicago", // Des Moines IA · zones C 51/51
    DTX: "America/Detroit", // Detroit/Pontiac MI · zones E 17/17
    DVN: "America/Chicago", // Quad Cities IA IL · zones C 36/36
    EAX: "America/Chicago", // Kansas City/Pleasant Hill MO · zones C 44/44
    EKA: "America/Los_Angeles", // Eureka CA · zones P 18/18
    EPZ: "America/Denver", // El Paso Tx/Santa Teresa NM · zones M 26/26
    EWX: "America/Chicago", // Austin/San Antonio TX · zones C 33/33
    FFC: "America/New_York", // Peachtree City GA · zones E 97/97
    FGF: "America/Chicago", // Grand Forks ND · zones C 42/42
    FGZ: "America/Phoenix", // Flagstaff AZ · zones M 19/19
    FSD: "America/Chicago", // Sioux Falls SD · zones C 45/45
    FWD: "America/Chicago", // Fort Worth TX · zones C 46/46
    GGW: "America/Denver", // Glasgow MT · zones M 16/16
    GID: "America/Chicago", // Hastings NE · zones C 30/30
    GJT: "America/Denver", // Grand Junction CO · zones M 28/28
    GLD: "America/Chicago", // Goodland KS · zones C 12/19
    GRB: "America/Chicago", // Green Bay WI · zones C 24/24
    GRR: "America/Detroit", // Grand Rapids MI · zones E 27/27
    GSP: "America/New_York", // Greenville-Spartanburg SC · zones E 57/57
    GUM: "Pacific/Guam", // Tiyan GU · zones G 8/8
    GYX: "America/New_York", // Gray ME · zones E 33/33
    HFO: "Pacific/Honolulu", // Honolulu HI · zones H 43/43
    HGX: "America/Chicago", // Houston/Galveston TX · zones C 35/35
    HNX: "America/Los_Angeles", // Hanford CA · zones P 40/40
    HUN: "America/Chicago", // Huntsville AL · zones C 14/14
    ICT: "America/Chicago", // Wichita KS · zones C 26/26
    ILM: "America/New_York", // Wilmington NC · zones E 26/26
    ILN: "America/New_York", // Wilmington OH · zones E 52/52
    ILX: "America/Chicago", // Lincoln IL · zones C 35/35
    IND: "America/New_York", // Indianapolis IN · zones E 39/39
    IWX: "America/New_York", // Northern Indiana · zones E 38/41
    JAN: "America/Chicago", // Jackson MS · zones C 58/58
    JAX: "America/New_York", // Jacksonville FL · zones E 50/50
    JKL: "America/New_York", // Jackson KY · zones E 33/33
    KEY: "America/New_York", // Key West FL · zones E 3/3
    LBF: "America/Chicago", // North Platte NE · zones C 17/27
    LCH: "America/Chicago", // Lake Charles LA · zones C 34/34
    LIX: "America/Chicago", // New Orleans LA · zones C 49/49
    LKN: "America/Los_Angeles", // Elko NV · zones P 11/11
    LMK: "America/New_York", // Louisville KY · zones E 39/59
    LOT: "America/Chicago", // Chicago IL · zones C 26/27
    LOX: "America/Los_Angeles", // Los Angeles/Oxnard CA · zones P 44/44
    LSX: "America/Chicago", // St Louis MO · zones C 46/46
    LUB: "America/Chicago", // Lubbock TX · zones C 24/24
    LWX: "America/New_York", // Baltimore MD/Washington DC · zones E 75/75
    LZK: "America/Chicago", // Little Rock AR · zones C 61/61
    MAF: "America/Chicago", // Midland/Odessa TX · zones C 31/37
    MEG: "America/Chicago", // Memphis TN · zones C 55/55
    MFL: "America/New_York", // Miami FL · zones E 15/15
    MFR: "America/Los_Angeles", // Medford OR · zones P 17/17
    MHX: "America/New_York", // Newport/Morehead City NC · zones E 21/21
    MKX: "America/Chicago", // Milwaukee/Sullivan WI · zones C 20/20
    MLB: "America/New_York", // Melbourne FL · zones E 20/20
    MOB: "America/Chicago", // Mobile AL · zones C 27/27
    MPX: "America/Chicago", // Twin Cities/Chanhassen MN · zones C 51/51
    MQT: "America/Detroit", // Marquette MI · zones E 11/15
    MRX: "America/New_York", // Morristown TN · zones E 44/47
    MSO: "America/Denver", // Missoula MT · zones M 13/14
    MTR: "America/Los_Angeles", // San Francisco CA · zones P 19/19
    OAX: "America/Chicago", // Omaha/Valley NE · zones C 38/38
    OHX: "America/Chicago", // Nashville TN · zones C 38/38
    OKX: "America/New_York", // Upton NY · zones E 34/34
    OTX: "America/Los_Angeles", // Spokane WA · zones P 20/20
    OUN: "America/Chicago", // Norman OK · zones C 56/56
    PAH: "America/Chicago", // Paducah KY · zones C 57/58
    PBZ: "America/New_York", // Pittsburgh PA · zones E 41/41
    PDT: "America/Los_Angeles", // Pendleton OR · zones P 22/22
    PHI: "America/New_York", // Mount Holly NJ · zones E 45/45
    PIH: "America/Boise", // Pocatello ID · zones M 25/25
    PPG: "Pacific/Pago_Pago", // Pago Pago  AS · zones S 4/4
    PQE: "Pacific/Guam", // Micronesia Domain East · zones K 9/19
    PQR: "America/Los_Angeles", // Portland OR · zones P 39/39
    PQW: "Pacific/Guam", // Micronesia Domain West · zones G 14/22
    PSR: "America/Phoenix", // Phoenix AZ · zones M 34/45
    PUB: "America/Denver", // Pueblo CO · zones M 39/39
    RAH: "America/New_York", // Raleigh NC · zones E 31/31
    REV: "America/Los_Angeles", // Reno NV · zones P 9/9
    RIW: "America/Denver", // Riverton WY · zones M 29/29
    RLX: "America/New_York", // Charleston WV · zones E 55/55
    RNK: "America/New_York", // Blacksburg VA · zones E 41/41
    SEW: "America/Los_Angeles", // Seattle WA · zones P 34/34
    SGF: "America/Chicago", // Springfield MO · zones C 37/37
    SGX: "America/Los_Angeles", // San Diego CA · zones P 13/13
    SHV: "America/Chicago", // Shreveport LA · zones C 48/48
    SJT: "America/Chicago", // San Angelo TX · zones C 24/24
    SJU: "America/Puerto_Rico", // San Juan PR · zones V 15/15
    SLC: "America/Denver", // Salt Lake City UT · zones M 32/32
    STO: "America/Los_Angeles", // Sacramento CA · zones P 44/44
    TAE: "America/New_York", // Tallahassee FL · zones E 48/66
    TBW: "America/New_York", // Tampa Bay Ruskin FL · zones E 36/36
    TFX: "America/Denver", // Great Falls MT · zones M 30/30
    TOP: "America/Chicago", // Topeka KS · zones C 23/23
    TSA: "America/Chicago", // Tulsa OK · zones C 40/40
    TWC: "America/Phoenix", // Tucson AZ · zones M 15/15
    UNR: "America/Denver", // Rapid City SD · zones M 32/35
    VEF: "America/Los_Angeles", // Las Vegas NV · zones P 20/26
  };


  const OFFICE_BY_WFO = {
    OHX: { officeShort: "Nashville TN", officeLoc: "Nashville", siteId: "OHX", fullStaId: "KOHX", wmo: "KWNS", pil: "SVROHX", timeZone: "America/Chicago" },
    HUN: { officeShort: "Huntsville AL", officeLoc: "Huntsville", siteId: "HUN", fullStaId: "KHTX", wmo: "KWNS", pil: "SVRHUN", timeZone: "America/Chicago" },
    RIW: { officeShort: "Riverton WY", officeLoc: "Riverton", siteId: "RIW", fullStaId: "KRIW", wmo: "KWNS", pil: "SVRRIW", timeZone: "America/Denver" },
    BIS: { officeShort: "Bismarck ND", officeLoc: "Bismarck", siteId: "BIS", fullStaId: "KBIS", wmo: "KWNS", pil: "SVRBIS", timeZone: "America/Chicago" },
    DLH: { officeShort: "Duluth MN", officeLoc: "Duluth", siteId: "DLH", fullStaId: "KDLH", wmo: "KWNS", pil: "SVRDLH", timeZone: "America/Chicago" },
    PHI: { officeShort: "Mount Holly NJ", officeLoc: "Mount Holly", siteId: "PHI", fullStaId: "KPHI", wmo: "KWNS", pil: "SVRPHI", timeZone: "America/New_York" },
    PSR: { officeShort: "Phoenix AZ", officeLoc: "Phoenix", siteId: "PSR", fullStaId: "KPSR", wmo: "KWNS", pil: "SVRPSR", timeZone: "America/Phoenix" }
  };

  const PRODUCT_META = {
    // NWS WWA_Changes_10124.pdf palette
    TOR: { name: "Tornado Warning", phen: "TO", sig: "W", defaultMinutes: 30, color: "#FF0000" },
    SVR: { name: "Severe Thunderstorm Warning", phen: "SV", sig: "W", defaultMinutes: 45, color: "#FFA500" },
    FFW: { name: "Flash Flood Warning", phen: "FF", sig: "W", defaultMinutes: 180, color: "#8B0000" },
    FAW: { name: "Areal Flood Warning", phen: "FA", sig: "W", defaultMinutes: 180, color: "#00FF00" },
    FAY: { name: "Flood Advisory", phen: "FA", sig: "Y", defaultMinutes: 180, color: "#00FF7F" },
    FRW: { name: "Fire Warning", phen: "FR", sig: "W", defaultMinutes: 120, color: "#A0522D" },
    SQW: { name: "Snow Squall Warning", phen: "SQ", sig: "W", defaultMinutes: 45, color: "#C71585" },
    DSW: { name: "Dust Storm Warning", phen: "DS", sig: "W", defaultMinutes: 60, color: "#FFE4C4" },
    DSY: { name: "Dust Advisory", phen: "DS", sig: "Y", defaultMinutes: 60, color: "#BDB76B" },
    SPS: { name: "Special Weather Statement", phen: "SPS", sig: "S", defaultMinutes: 60, color: "#FFE4B5" },
    // Special Marine Warning (MA.W) — storm-based poly and/or marine zone UGC
    SMW: { name: "Special Marine Warning", phen: "MA", sig: "W", defaultMinutes: 45, color: "#FFA500" },
    MWS: { name: "Marine Weather Statement", phen: "", sig: "", defaultMinutes: 120, color: "#87CEFA" }
  };

  const HAIL_OPTIONS = [
    { id: "none", label: "None", size: 0, threat: "", tag: "<.75IN" },
    { id: "penny", label: 'Penny (0.75")', size: 0.75, threat: "penny size", tag: "0.75IN" },
    { id: "nickel", label: 'Nickel (0.88")', size: 0.88, threat: "nickel size", tag: "0.88IN" },
    { id: "quarter", label: 'Quarter (1.00")', size: 1.0, threat: "quarter size", tag: "1.00IN" },
    { id: "halfdollar", label: 'Half dollar (1.25")', size: 1.25, threat: "half dollar size", tag: "1.25IN" },
    { id: "pingpong", label: 'Ping pong (1.50")', size: 1.5, threat: "ping pong ball size", tag: "1.50IN" },
    { id: "golfball", label: 'Golf ball (1.75")', size: 1.75, threat: "golf ball size", tag: "1.75IN" },
    { id: "twoinch", label: '2.00"', size: 2.0, threat: "two inches in diameter", tag: "2.00IN" },
    { id: "tennis", label: 'Tennis ball (2.50")', size: 2.5, threat: "tennis ball size", tag: "2.50IN" },
    { id: "baseball", label: 'Baseball (2.75")', size: 2.75, threat: "baseball size", tag: "2.75IN" },
    { id: "threeinch", label: '3.00"', size: 3.0, threat: "three inches in diameter", tag: "3.00IN" },
    { id: "softball", label: 'Softball (4.00")', size: 4.0, threat: "softball size", tag: "4.00IN" },
    { id: "grapefruit", label: 'Grapefruit (4.50")', size: 4.5, threat: "grapefruit size", tag: "4.50IN" },
    { id: "dvd", label: 'DVD (5.00")', size: 5.0, threat: "dvd size", tag: "5.00IN" }
  ];

  const WIND_OPTIONS = [
    { id: "none", label: "None", speed: 0, threat: "", tag: "<50MPH" },
    { id: "60", label: "60 mph", speed: 60, threat: "damaging winds in excess of 60 mph", tag: "60MPH" },
    { id: "70", label: "70 mph", speed: 70, threat: "destructive winds in excess of 70 mph", tag: "70MPH" },
    { id: "80", label: "80 mph", speed: 80, threat: "destructive winds in excess of 80 mph", tag: "80MPH" },
    { id: "90", label: "90 mph", speed: 90, threat: "extreme damaging winds in excess of 90 mph", tag: "90MPH" },
    { id: "100", label: "100 mph", speed: 100, threat: "extreme damaging winds in excess of 100 mph", tag: "100MPH" }
  ];

  const BASIS_OPTIONS = [
    { id: "doppler", label: "Doppler radar indicated" },
    { id: "meteorologists", label: "ZASNetwork meteorologists detected" },
    { id: "trainedSpotters", label: "Trained weather spotters reported" },
    { id: "lawEnforcement", label: "Local law enforcement reported" },
    { id: "emergencyMgmt", label: "Emergency management reported" },
    { id: "public", label: "The public reported" }
  ];

  function createState(wfo) {
    return {
      product: "SVR",
      stormType: "cell",
      mode: "idle",
      vertices: [],
      polygon: null,
      ugcBasis: "county",
      counties: [],
      zones: [],
      places: [],
      locationMode: "cities",
      location: null,
      locationPhrase: "",
      locationOverride: "",
      lineStart: null,
      lineEnd: null,
      lineStartPhrase: "",
      lineEndPhrase: "",
      motion1: null,
      motion2: null,
      motion: null,
      motionOverride: { dirText: "", speedMph: "", stationary: false },
      basis: "doppler",
      cancelReason: "",
      windId: "60",
      hailId: "quarter",
      validMinutes: 45,
      // Product-specific options (WarnGen-style bullets)
      ffw: {
        family: "convective",
        damageThreat: "base",
        expectedRain: "none",
        expectedRainCustom: "",
        dam: { cause: "dam", damageThreat: "base", source: "county", damName: "", riverName: "", locations: "", details: "" },
        trackMotion: false,
        source: "doppler", // doppler | dopplerGauge | trainedSpotters | public | lawEnforcement | emergencyManagement | satellite | satelliteGauge | onlyGauge
        withThunder: true,
        plainRain: false,
        alreadyOccurring: false, // flash / EXT wording
        rainAmount: "none", // none | rain1 | rain2 | rain3 | rainEdit
        rainEditText: "",
        snowMelt: false, // icrs
        burnScar: false,
        mudSlide: false,
        emergency: false,
        emergencyLoc: "",
        addRainfall: false,
        addRainfallText: "",
        listCities: true,
        ctas: {
          tadd: true,
          actQuickly: true,
          childSafety: false,
          nighttime: false,
          urban: false,
          rural: false,
          stayAway: false,
          lowSpots: false,
          arroyos: false,
          burnAreas: false,
          camperSafety: false,
          reportFlooding: false,
          ffwMeans: true,
          emergencyCta: false
        }
      },
      afw: {
        floodType: "general", // general | smallstreams | urbansmallstreams
        cause: "ER", // ER | SM | DM | DR | RS | IJ | IC | GO | MC | UU
        source: "doppler",
        withThunder: true,
        floodingOccurring: false,
        locationText: "",
        rainAmount: "none",
        rainEditText: "",
        addRainfall: false,
        addRainfallText: "",
        drainages: "",
        specificStream: "",
        listCities: true,
        ctas: {
          tadd: true,
          actQuickly: false,
          childSafety: false,
          nighttime: false,
          urban: false,
          rural: false,
          stayAway: false,
          lowSpots: false,
          arroyos: false,
          burnAreas: false,
          camperSafety: false,
          reportFlooding: false,
          warningMeans: true
        }
      },
      fad: {
        floodType: "general", cause: "ER", source: "doppler", withThunder: true,
        floodingOccurring: false, locationText: "", rainAmount: "none", rainEditText: "",
        addRainfall: false, addRainfallText: "", drainages: "", specificStream: "",
        listCities: true,
        ctas: { tadd: true, childSafety: false, nighttime: false, urban: false, rural: false,
          stayAway: false, lowSpots: false, arroyos: false, burnAreas: false,
          camperSafety: false, reportFlooding: false, warningMeans: true }
      },
      frw: {
        requestedBy: "", scenario: "actual", details: "", locations: "",
        arrivalTime: "", fireEmergency: false,
        ctas: { stayIndoors: false, followInstructions: true, heedEvacuations: true }
      },
      tor: {
        source: "doppler", // doppler | dopplerSquall | confirmedDoppler | confirmedLarge | meteorologistsTOR | meteorologistsSquall | meteorologistsLarge | spotter | lawEnforcement | emergencyManagement | public | spotterFunnelCloud
        emergency: false,
        emergencyLoc: "",
        hailId: "none",
        windId: "none",
        damageThreat: "base",
        landspout: false,
        listCities: true,
        ctas: {
          defaultMobile: true,
          defaultUrban: false,
          motorists: false,
          rainWrapped: false,
          nighttime: false,
          largeTor: false,
          lawEnforcement: false,
          squall: false,
          water: false,
          torrentialRain: false,
          windHailIndicated: false,
          windHailObserved: false,
          replacesSvr: false,
          emergencyCta: false
        }
      },
      sqw: {
        source: "radar",
        impact: "general",
        visibility: "one quarter mile or less",
        wind: "",
        roadCondition: "",
        basis: "",
        highways: "",
        flashFreeze: false,
        listLocations: true
      },
      dsw: {
        source: "meteorologist",
        visibility: "one quarter mile or less",
        wind: "25 mph or greater",
        basis: "",
        highways: "",
        listLocations: true
      },
      // SPS — Special Weather Statement (near-severe / lower-impact wintry weather)
      sps: {
        // precipMode: rain | snow
        precipMode: "rain",
        // eventKind (rain): thunderstorm | noThunder | areaOfThunderstorms
        // eventKind (snow): snowSquall | snowSquallDangerous | snowSquallSevere | snowArea
        // eventKind (wintry): freezingRain | freezingDrizzle | sleet | wintryMix | flashFreeze
        eventKind: "thunderstorm",
        blankStatement: false,
        blankHeadline: "",
        windId: "none", // none | wind30 | wind40 | wind50 | wind55
        hailId: "none", // none | pea | half | penny | nickel
        listCities: true,
        specialEvent: false,
        specialEventText: "",
        ctas: {
          generic: true,
          torrentialRain: false,
          lightning: false,
          stormIntensify: false,
          lawEnforcement: false,
          boaters: false,
          camper: false,
          coldAirFunnel: false,
          quarterMile: false,
          zeroMile: false,
          advisory: false,
          advisoryEffect: false,
          snowSquall: false,
          freezingDrizzle: false,
          flashFreeze: false,
          icyRoads: false,
          changingConditions: false
        }
      },
      // SMW — Special Marine Warning (NWS SMW.vm / MA.W)
      smw: {
        // geometryMode: polygon (storm-based freehand) | zone (select marine zones)
        geometryMode: "polygon",
        // eventType: thunderstorm | shower | cloud | front | volcano
        eventType: "thunderstorm",
        // wind: none | kt34 | kt40 | kt40plus | kt50 | kt65
        windId: "kt34",
        // hail: none | small | large | destructive
        hailId: "none",
        // waterspout: none | possible | sighted
        spout: "none",
        // ashfall / debris for volcano path (rare)
        ashfall: false,
        debrisFlow: false,
        // basis: doppler | satellite | marineSpotter | mariner | public | pilot |
        //        coastGuard | lawEnforcement | emergencyManagement | ship | buoy
        basis: "doppler",
        listLocations: true,
        ctas: {
          boaters: true,
          lightning: false,
          moveIndoors: true,
          delayBoating: false,
          seekSafeHarbor: true
        }
      },
      mws: { headline: "", visibility: "", details: "" },
      ctas: { generic: true, tornadoPossible: false, largeHail: false, largeHailWind: false, veryLargeHail: false, extremeWinds: false, gustFront: false, squallLine: false, supercell: false, windHailIndicated: false, windHailObserved: false, torrentialRain: false, boaters: false, lightning: false, lawEnforcement: false, observedHail: false, observedWind: false },
      forecaster: "",
      text: "",
      wfo: wfo || "OHX",
      // Lifecycle: draft → active (NEW) → update (CON/EXT) → cancelled (CAN)
      warningId: null,
      etn: null,
      action: "NEW",
      status: "draft",
      issuedAt: null,
      expiresAt: null,
      segment: 0,
      /** Geometry history for GRLevel TimeRange placefiles */
      timeline: []
    };
  }

  /** Normalize WFO/product for ETN sequence keys (KPHI and PHI must share a sequence). */
  function normalizeEtnWfo(wfo) {
    return String(wfo || "OHX")
      .replace(/^K/i, "")
      .toUpperCase()
      .slice(0, 3) || "OHX";
  }

  function normalizeEtnProduct(product) {
    const code = String(product || "SVR").toUpperCase();
    if (code === "FAW") return "FLW";
    if (code === "FAY") return "FLS";
    return code || "SVR";
  }

  /**
   * Next event tracking number for a WFO/product pair (1–9999).
   * Counts every record with a numeric ETN (active, cancelled, expired) so a
   * cleared list or multi-tab session cannot restart at 0001 while prior products exist.
   */
  function nextEtn(store, wfo, product) {
    const office = normalizeEtnWfo(wfo);
    const phen = normalizeEtnProduct(product);
    const used = (store || [])
      .filter((w) => {
        if (!w) return false;
        const itemOffice = normalizeEtnWfo(w.wfo || w.office);
        const itemPhen = normalizeEtnProduct(w.product || w.hazardCode);
        const etn = Number(w.etn || w.watchNumber);
        return itemOffice === office && itemPhen === phen && Number.isFinite(etn) && etn > 0;
      })
      .map((w) => Number(w.etn || w.watchNumber));
    const max = used.length ? Math.max(...used) : 0;
    return (max % 9999) + 1;
  }

  function formatEtn(etn) {
    const n = Number(etn);
    if (!Number.isFinite(n) || n <= 0) {
      return "0000";
    }
    return String(Math.max(1, Math.min(9999, Math.round(n)))).padStart(4, "0");
  }

  /**
   * Office-scoped product id for display: OHXSPS0001, OHXSVR0012, etc.
   * ETN sequences are per WFO + product (same as nextEtn).
   */
  function formatProductId(wfo, product, etn) {
    return `${normalizeEtnWfo(wfo)}${normalizeEtnProduct(product)}${formatEtn(etn)}`;
  }

  function officeIanaTimeZone(wfoOrOffice) {
    if (wfoOrOffice && typeof wfoOrOffice === "object") {
      if (wfoOrOffice.timeZone) return String(wfoOrOffice.timeZone);
      if (wfoOrOffice.siteId && WFO_IANA[wfoOrOffice.siteId]) return WFO_IANA[wfoOrOffice.siteId];
    }
    const code = String(wfoOrOffice || "")
      .replace(/^K/i, "")
      .toUpperCase()
      .slice(0, 3);
    return WFO_IANA[code] || "America/Chicago";
  }

  /**
   * Local clock parts for product headers (NWS style) using IANA zone so DST is correct.
   * PHI → America/New_York → EDT/EST, not CDT.
   */
  function resolveOfficeLocalParts(date, office) {
    const d = date instanceof Date ? date : new Date(date);
    const timeZone = officeIanaTimeZone(office || {});
    let parts;
    try {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZoneName: "short"
      }).formatToParts(Number.isFinite(d.getTime()) ? d : new Date());
    } catch {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZoneName: "short"
      }).formatToParts(Number.isFinite(d.getTime()) ? d : new Date());
    }
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    let hours = Number(get("hour")) || 12;
    const minutes = get("minute") || "00";
    const ampm = (get("dayPeriod") || "AM").toUpperCase();
    let tz = get("timeZoneName") || "LT";
    // Normalize rare forms (e.g. "Eastern Daylight Time") to short if needed
    if (tz.length > 5 && /daylight|standard/i.test(tz)) {
      if (/eastern/i.test(tz)) tz = /daylight/i.test(tz) ? "EDT" : "EST";
      else if (/central/i.test(tz)) tz = /daylight/i.test(tz) ? "CDT" : "CST";
      else if (/mountain/i.test(tz)) tz = /daylight/i.test(tz) ? "MDT" : "MST";
      else if (/pacific/i.test(tz)) tz = /daylight/i.test(tz) ? "PDT" : "PST";
    }
    // Offset hours for any legacy callers still using fixed math
    let tzOffsetHours = -5;
    try {
      const probe = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
      const utcStr = probe.toLocaleString("en-US", { timeZone: "UTC" });
      const locStr = probe.toLocaleString("en-US", { timeZone });
      tzOffsetHours = Math.round((new Date(locStr) - new Date(utcStr)) / 3600000);
    } catch {
      /* keep default */
    }
    return {
      hours,
      minutes,
      ampm,
      tz,
      weekday: get("weekday") || "Mon",
      month: get("month") || "Jan",
      day: get("day") || "1",
      year: get("year") || "2026",
      timeZone,
      tzOffsetHours
    };
  }

  function getOffice(wfo) {
    const code = String(wfo || "OHX").replace(/^K/i, "").toUpperCase().slice(0, 3);
    const timeZone = WFO_IANA[code] || OFFICE_BY_WFO[code]?.timeZone || "America/Chicago";
    const base =
      OFFICE_BY_WFO[code] || {
        officeShort: code,
        officeLoc: code,
        siteId: code,
        fullStaId: `K${code}`,
        wmo: "KWNS",
        pil: `SVR${code}`,
        timeZone
      };
    // Always stamp live tz label + offset for the current moment
    const local = resolveOfficeLocalParts(new Date(), { ...base, timeZone: base.timeZone || timeZone });
    return {
      ...base,
      siteId: code,
      timeZone: base.timeZone || timeZone,
      tz: local.tz,
      tzOffsetHours: local.tzOffsetHours
    };
  }

  function registerOffice(wfo, office = {}) {
    const code = String(wfo || "").replace(/^K/i, "").toUpperCase().slice(0, 3);
    if (!code) {
      return null;
    }
    const current = getOffice(code);
    const timeZone = office.timeZone || current.timeZone || WFO_IANA[code] || "America/Chicago";
    OFFICE_BY_WFO[code] = {
      ...current,
      ...office,
      siteId: code,
      timeZone,
      fullStaId: String(office.fullStaId || current.fullStaId || `K${code}`).toUpperCase(),
      pil: office.pil || current.pil || `SVR${code}`
    };
    return getOffice(code);
  }

  function getProductMeta(product) {
    return PRODUCT_META[product] || PRODUCT_META.SVR;
  }

  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  function toDegrees(rad) {
    return (rad * 180) / Math.PI;
  }

  function haversineMiles(a, b) {
    const R = 3958.7613;
    const dLat = toRadians(b[1] - a[1]);
    const dLon = toRadians(b[0] - a[0]);
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function initialBearingDeg(a, b) {
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);
    const dLon = toRadians(b[0] - a[0]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function compass16(bearing) {
    const dirs = [
      "north",
      "north-northeast",
      "northeast",
      "east-northeast",
      "east",
      "east-southeast",
      "southeast",
      "south-southeast",
      "south",
      "south-southwest",
      "southwest",
      "west-southwest",
      "west",
      "west-northwest",
      "northwest",
      "north-northwest"
    ];
    const idx = Math.round(bearing / 22.5) % 16;
    return dirs[idx];
  }

  function roundTo5(n) {
    return Math.round(Number(n) / 5) * 5;
  }

  /**
   * Round a Date up to the next :00 / :15 / :30 / :45 (UTC ms grid).
   * Already exact quarter-hour (0 sec/ms) stays put.
   * Used for warning expire times so products read like NWS ("until 2:45 PM").
   */
  function roundUpToNextQuarterHour(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) {
      return new Date();
    }
    const quarterMs = 15 * 60 * 1000;
    const t = d.getTime();
    if (t % quarterMs === 0) {
      return new Date(t);
    }
    return new Date(Math.ceil(t / quarterMs) * quarterMs);
  }

  /** now + duration minutes, then ceil to next quarter-hour expire. */
  function computeExpireTime(fromDate, validMinutes) {
    const start = fromDate instanceof Date ? fromDate : new Date(fromDate);
    const minutes = Math.max(1, Number(validMinutes) || 30);
    const raw = new Date(start.getTime() + minutes * 60 * 1000);
    return roundUpToNextQuarterHour(raw);
  }

  function pointInRing(point, ring) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
      if (intersects) {
        inside = !inside;
      }
    }
    return inside;
  }

  function geometryContainsPoint(geometry, point) {
    if (!geometry) {
      return false;
    }
    if (geometry.type === "Polygon") {
      const [outer, ...holes] = geometry.coordinates;
      if (!pointInRing(point, outer)) {
        return false;
      }
      return holes.every((hole) => !pointInRing(point, hole));
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some((poly) =>
        geometryContainsPoint({ type: "Polygon", coordinates: poly }, point)
      );
    }
    return false;
  }

  function bboxOfGeometry(geometry) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const walk = (coords) => {
      if (typeof coords[0] === "number") {
        minX = Math.min(minX, coords[0]);
        minY = Math.min(minY, coords[1]);
        maxX = Math.max(maxX, coords[0]);
        maxY = Math.max(maxY, coords[1]);
        return;
      }
      coords.forEach(walk);
    };
    walk(geometry.coordinates);
    return [minX, minY, maxX, maxY];
  }

  function bboxesOverlap(a, b) {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
  }

  function featureIntersectsPolygon(feature, polygon) {
    if (!feature || !feature.geometry || !polygon) {
      return false;
    }

    if (global.turf && turf.booleanIntersects) {
      try {
        return turf.booleanIntersects(feature, { type: "Feature", properties: {}, geometry: polygon });
      } catch {
        // fall through
      }
    }

    const polyBbox = bboxOfGeometry(polygon);
    const featBbox = bboxOfGeometry(feature.geometry);
    if (!bboxesOverlap(polyBbox, featBbox)) {
      return false;
    }

    const ring = polygon.coordinates[0];
    // any warning vertex in feature
    for (const vertex of ring) {
      if (geometryContainsPoint(feature.geometry, vertex)) {
        return true;
      }
    }
    // centroid / sample in polygon
    const props = feature.properties || {};
    if (Number.isFinite(props.LON) && Number.isFinite(props.LAT)) {
      if (pointInRing([props.LON, props.LAT], ring)) {
        return true;
      }
    }
    const cx = (featBbox[0] + featBbox[2]) / 2;
    const cy = (featBbox[1] + featBbox[3]) / 2;
    if (pointInRing([cx, cy], ring) && geometryContainsPoint(feature.geometry, [cx, cy])) {
      return true;
    }
    // any feature exterior ring vertex in warning poly
    const sampleRings =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates[0]]
        : feature.geometry.coordinates.map((p) => p[0]);
    for (const outer of sampleRings) {
      for (let i = 0; i < outer.length; i += Math.max(1, Math.floor(outer.length / 24))) {
        if (pointInRing(outer[i], ring)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Exterior ring of a Polygon/MultiPolygon → vertex list (no closing duplicate). */
  function polygonToVertices(polygon) {
    if (!polygon || !polygon.coordinates) {
      return [];
    }
    let ring = null;
    if (polygon.type === "Polygon") {
      ring = polygon.coordinates[0];
    } else if (polygon.type === "MultiPolygon") {
      ring = polygon.coordinates[0] && polygon.coordinates[0][0];
    }
    if (!Array.isArray(ring) || ring.length < 3) {
      return [];
    }
    // Drop closing point if present
    const verts = ring.map((c) => [Number(c[0]), Number(c[1])]).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    if (verts.length >= 2) {
      const a = verts[0];
      const b = verts[verts.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) {
        verts.pop();
      }
    }
    return verts;
  }

  function verticesToPolygon(vertices) {
    if (!vertices || vertices.length < 3) {
      return null;
    }
    const ring = vertices.map((v) => [v[0], v[1]]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
    return { type: "Polygon", coordinates: [ring] };
  }

  function countyUgc(props) {
    const state = String(props.STATE || "").toUpperCase();
    const fips = String(props.FIPS || "");
    const ccc = fips.slice(-3).padStart(3, "0");
    return `${state}C${ccc}`;
  }

  function zoneUgc(props) {
    if (props.STATE_ZONE) {
      const raw = String(props.STATE_ZONE).toUpperCase();
      if (/^[A-Z]{2}Z?\d{3}$/.test(raw)) {
        return raw.includes("Z") ? raw : `${raw.slice(0, 2)}Z${raw.slice(2)}`;
      }
    }
    const state = String(props.STATE || "").toUpperCase();
    const zone = String(props.ZONE || "").padStart(3, "0");
    return `${state}Z${zone}`;
  }

  function filterCwaFeatures(featureCollection, wfo) {
    const features = (featureCollection && featureCollection.features) || [];
    // null / "*" / "SPC" → national (no CWA filter) — used by SPC desk watches
    if (!wfo || wfo === "*" || wfo === "SPC") {
      return features;
    }
    const code = String(wfo).replace(/^K/i, "").toUpperCase().slice(0, 3);
    return features.filter((f) => {
      const raw = String((f.properties || {}).CWA || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      // Some counties are split between forecast offices and use concatenated
      // CWA codes (for example Somerset County, ME is GYXCAR). Treat each
      // three-character group as an issuing office instead of requiring the
      // entire field to equal one code.
      const offices = raw.match(/[A-Z0-9]{3}/g) || [];
      return offices.includes(code);
    });
  }

  /** Marine zones use WFO (not CWA). ID is already UGC (AMZ131, LSZ144, …). */
  function filterMarineZoneFeatures(featureCollection, wfo) {
    const features = (featureCollection && featureCollection.features) || [];
    if (!wfo || wfo === "*" || wfo === "SPC") {
      return features;
    }
    const code = String(wfo).replace(/^K/i, "").toUpperCase().slice(0, 3);
    return features.filter((f) => {
      const p = f.properties || {};
      const office = String(p.WFO || p.GL_WFO || p.CWA || "").toUpperCase();
      return office === code;
    });
  }

  function marineZoneUgc(props) {
    const id = String(props.ID || props.STATE_ZONE || props.NAME || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^[A-Z]{2,3}Z?\d{3}$/.test(id)) {
      return id.includes("Z") ? id : `${id.slice(0, 2)}Z${id.slice(2)}`;
    }
    return id || "AMZ000";
  }

  function marineZoneRecord(feature) {
    const p = (feature && feature.properties) || {};
    return {
      name: p.NAME || p.ID || "Marine zone",
      state: String(p.ID || "").slice(0, 2),
      zone: String(p.ID || "").slice(3),
      ugc: marineZoneUgc(p),
      wfo: p.WFO || p.GL_WFO || "",
      feature
    };
  }

  /**
   * Intersect freehand SMW polygon with marine zones for the issuing WFO.
   * Returns zone list (+ empty counties) for UGC / area wording.
   */
  function resolveMarineAreas(polygon, marineFc, wfo) {
    const zones = filterMarineZoneFeatures(marineFc, wfo)
      .filter((f) => featureIntersectsPolygon(f, polygon))
      .map(marineZoneRecord)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { counties: [], zones, places: [] };
  }

  /** Build MultiPolygon from selected marine zone records (zone-based SMW). */
  function marineZonesToPolygon(zones) {
    const coords = [];
    (zones || []).forEach((z) => {
      const g = z.geometry || z.feature?.geometry;
      if (!g) return;
      if (g.type === "Polygon") coords.push(g.coordinates);
      else if (g.type === "MultiPolygon") coords.push(...g.coordinates);
    });
    if (!coords.length) return null;
    if (coords.length === 1) return { type: "Polygon", coordinates: coords[0] };
    return { type: "MultiPolygon", coordinates: coords };
  }

  function countyAreaPhrase(countyFeature, warningGeometry, countyName) {
    const cleanName = String(countyName || "Unknown").replace(/\s+County$/i, "").trim();
    const fullCounty = `${cleanName} County`;
    const turf = global.turf;
    if (!turf || !countyFeature?.geometry || !warningGeometry) return fullCounty;
    try {
      const county = turf.feature(countyFeature.geometry);
      const warning = turf.feature(warningGeometry);
      let affected = null;
      try {
        affected = turf.intersect(county, warning);
      } catch {
        affected = turf.intersect(turf.featureCollection([county, warning]));
      }
      if (!affected) return fullCounty;
      const countyArea = turf.area(county);
      const affectedArea = turf.area(affected);
      if (!countyArea || affectedArea / countyArea >= 0.62) return fullCounty;

      const countyCenter = turf.centerOfMass(county).geometry.coordinates;
      const affectedCenter = turf.centerOfMass(affected).geometry.coordinates;
      const bounds = turf.bbox(county);
      const halfWidth = Math.max(0.001, (bounds[2] - bounds[0]) / 2);
      const halfHeight = Math.max(0.001, (bounds[3] - bounds[1]) / 2);
      const eastWest = (affectedCenter[0] - countyCenter[0]) / halfWidth;
      const northSouth = (affectedCenter[1] - countyCenter[1]) / halfHeight;

      if (Math.hypot(eastWest, northSouth) < 0.24) return `Central ${fullCounty}`;
      const horizontal = Math.abs(eastWest) >= 0.32 ? (eastWest > 0 ? "eastern" : "western") : "";
      const vertical = Math.abs(northSouth) >= 0.32 ? (northSouth > 0 ? "northern" : "southern") : "";
      let direction;
      if (vertical && horizontal) direction = `${vertical.slice(0, -3)}${horizontal}`;
      else direction = vertical || horizontal || "central";
      return `${direction.charAt(0).toUpperCase()}${direction.slice(1)} ${fullCounty}`;
    } catch {
      return fullCounty;
    }
  }

  function resolveAreas(polygon, countyFc, zoneFc, places, wfo) {
    const counties = filterCwaFeatures(countyFc, wfo)
      .filter((f) => featureIntersectsPolygon(f, polygon))
      .map((f) => {
        const p = f.properties || {};
        const name = p.COUNTYNAME || p.NAME || "Unknown";
        return {
          name,
          state: p.STATE,
          fips: p.FIPS,
          ugc: countyUgc(p),
          areaPhrase: countyAreaPhrase(f, polygon, name),
          feature: f
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const zones = filterCwaFeatures(zoneFc, wfo)
      .filter((f) => featureIntersectsPolygon(f, polygon))
      .map((f) => {
        const p = f.properties || {};
        return {
          name: p.NAME || p.SHORTNAME || "Unknown",
          state: p.STATE,
          zone: p.ZONE,
          ugc: zoneUgc(p),
          feature: f
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const polyBbox = bboxOfGeometry(polygon);
    // Expand bbox slightly so edge towns aren't dropped by the prefilter.
    const padDeg = 0.08; // ~5–6 mi mid-latitudes
    const searchBbox = [
      polyBbox[0] - padDeg,
      polyBbox[1] - padDeg,
      polyBbox[2] + padDeg,
      polyBbox[3] + padDeg
    ];

    /** Miles from point to nearest vertex of outer ring (cheap edge proximity). */
    function milesToPolygon(point, poly) {
      if (geometryContainsPoint(poly, point)) {
        return 0;
      }
      const ring =
        poly.type === "Polygon"
          ? poly.coordinates[0]
          : poly.type === "MultiPolygon"
            ? poly.coordinates[0][0]
            : null;
      if (!ring || !ring.length) {
        return Infinity;
      }
      let best = Infinity;
      for (let i = 0; i < ring.length; i++) {
        const d = haversineMiles(point, ring[i]);
        if (d < best) {
          best = d;
        }
      }
      // Sample mid-edges for better proximity
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const d = haversineMiles(point, mid);
        if (d < best) {
          best = d;
        }
      }
      return best;
    }

    // Include cities whose center is inside the poly, or within a tight edge buffer.
    // Do NOT fall back to far-away majors (Dickson/Columbia when the cell is near Franklin).
    const EDGE_BUFFER_MI = 3.5;
    const scored = (places || [])
      .map((f) => {
        if (!f || !f.geometry || !f.geometry.coordinates) {
          return null;
        }
        const [lng, lat] = f.geometry.coordinates;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return null;
        }
        if (Math.abs(lng) < 0.05 || Math.abs(lat) < 0.05) {
          return null;
        }
        if (lng < searchBbox[0] || lng > searchBbox[2] || lat < searchBbox[1] || lat > searchBbox[3]) {
          return null;
        }
        const p = f.properties || {};
        const name = p.name;
        if (!name) {
          return null;
        }
        const coords = [lng, lat];
        const inside = geometryContainsPoint(polygon, coords);
        const dist = inside ? 0 : milesToPolygon(coords, polygon);
        if (!inside && dist > EDGE_BUFFER_MI) {
          return null;
        }
        return {
          name,
          state: p.state,
          rank: Number(p.rank) || 4,
          coordinates: coords,
          inside,
          dist
        };
      })
      .filter(Boolean);

    // Prefer in-poly first, then nearer edge towns, then better-known (lower rank).
    scored.sort((a, b) => {
      if (a.inside !== b.inside) {
        return a.inside ? -1 : 1;
      }
      if (a.dist !== b.dist) {
        return a.dist - b.dist;
      }
      return a.rank - b.rank || a.name.localeCompare(b.name);
    });

    // Prefer better-known places for product text: rank 1–4 first, then micro (5).
    // Cap so SPS/SVR bullets stay readable.
    const preferred = scored.filter((p) => p.rank <= 4);
    const micros = scored.filter((p) => p.rank >= 5);
    const ordered = preferred.length ? preferred.concat(micros) : scored;
    const placeList = ordered.slice(0, 28).map(({ name, state, rank, coordinates, inside, dist }) => ({
      name,
      state,
      rank,
      coordinates,
      inside,
      dist
    }));

    return { counties, zones, places: placeList };
  }

  function formatUgcLine(ugcs, expireDate) {
    const unique = [...new Set(ugcs)].sort();
    if (!unique.length) {
      return "TNZ000-000000-";
    }
    // NWS packs UGCs; keep simple hyphen list + expire ddhhmm
    const dd = String(expireDate.getUTCDate()).padStart(2, "0");
    const hh = String(expireDate.getUTCHours()).padStart(2, "0");
    const mm = String(expireDate.getUTCMinutes()).padStart(2, "0");
    const chunks = [];
    let line = "";
    unique.forEach((u, i) => {
      const next = i === 0 ? u : `-${u.slice(3)}`;
      // simplified: full ugc each time for clarity
      chunks.push(u);
    });
    // Group by state prefix for slightly cleaner line
    const byState = {};
    unique.forEach((u) => {
      const st = u.slice(0, 3); // TNC or TNZ
      byState[st] = byState[st] || [];
      byState[st].push(u.slice(3));
    });
    const parts = Object.keys(byState)
      .sort()
      .map((prefix) => {
        const nums = byState[prefix].sort();
        return `${prefix}${nums[0]}${nums.slice(1).map((n) => `-${n}`).join("")}`;
      });
    return `${parts.join("-")}-${dd}${hh}${mm}-`;
  }

  function computeMotion(point1, point2) {
    if (!point1 || !point2 || !Number.isFinite(point1.timestampMs) || !Number.isFinite(point2.timestampMs)) {
      return null;
    }
    const t1 = Math.min(point1.timestampMs, point2.timestampMs);
    const t2 = Math.max(point1.timestampMs, point2.timestampMs);
    const early = point1.timestampMs <= point2.timestampMs ? point1 : point2;
    const late = point1.timestampMs <= point2.timestampMs ? point2 : point1;
    const dtMs = t2 - t1;
    if (dtMs < 60_000) {
      return {
        stationary: true,
        speedMph: 0,
        speedKts: 0,
        bearing: 0,
        directionText: "nearly stationary",
        dtMinutes: dtMs / 60000,
        early,
        late
      };
    }
    const distMi = haversineMiles(early.lngLat, late.lngLat);
    const speedMph = distMi / (dtMs / 3600000);
    const speedKts = speedMph / 1.15078;
    const bearing = initialBearingDeg(early.lngLat, late.lngLat);
    const stationary = speedMph < 5;
    return {
      stationary,
      speedMph,
      speedKts,
      bearing,
      directionText: stationary ? "nearly stationary" : compass16(bearing),
      dtMinutes: dtMs / 60000,
      distMi,
      early,
      late
    };
  }

  /**
   * Pick a reference city for "located X miles DIR of City".
   * Every community is eligible. Distance leads, with a modest prominence
   * preference only when two useful reference points are similarly close.
   */
  function findLocationPhrase(point, places, maxMiles = 80) {
    if (!point || !places || !places.length) {
      return { phrase: "near an unknown location", primary: null, distanceMi: null, direction: null };
    }

    const scored = places
      .map((p) => {
        const coords = p.coordinates || (p.geometry && p.geometry.coordinates);
        if (!coords || coords.length < 2) {
          return null;
        }
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) < 0.05 || Math.abs(lat) < 0.05) {
          return null;
        }
        const dist = haversineMiles(point, [lng, lat]);
        const rank = Number(p.rank) || Number(p.properties && p.properties.rank) || 4;
        const population = Math.max(0, Number(p.population) || Number(p.properties && p.properties.population) || 0);
        const name = p.name || (p.properties && p.properties.name);
        const state = p.state || (p.properties && p.properties.state) || "";
        if (!name) {
          return null;
        }
        return { name, state, rank, population, dist, coords: [lng, lat] };
      })
      .filter(Boolean)
      .filter((p) => p.dist <= maxMiles);

    if (!scored.length) {
      return { phrase: "near an unknown location", primary: null, distanceMi: null, direction: null };
    }

    // Nearest place first — the full gazetteer is eligible, including small
    // towns and unincorporated communities.
    scored.sort((a, b) => a.dist - b.dist || a.rank - b.rank);
    const nearest = scored[0];

    // Among places not much farther than the nearest, prefer a better-known name.
    // Band grows slightly with distance so very remote cells can still pick a regional hub.
    const bandMi = Math.max(4, Math.min(10, nearest.dist * 0.55 + 2));
    const inBand = scored.filter((p) => p.dist <= nearest.dist + bandMi);
    // Population is a soft tie-breaker, never a minimum. A nearby small town
    // remains preferable to a distant city; a slightly farther recognizable
    // city can win when both are reasonable references.
    const referenceScore = (place) => {
      const rankPenalty = Math.max(0, place.rank - 1) * 1.25;
      const populationBonus = place.population > 0
        ? Math.min(4, Math.log10(place.population + 1) * 0.8)
        : 0;
      return place.dist + rankPenalty - populationBonus;
    };
    inBand.sort((a, b) => referenceScore(a) - referenceScore(b) || a.dist - b.dist);
    const primary = inBand[0] || nearest;

    const bearing = initialBearingDeg(primary.coords, point);
    // direction FROM city TO storm = where storm is relative to city
    const dirFromCity = compass16(bearing);
    const miles = Math.max(1, Math.round(primary.dist));

    let phrase;
    if (primary.dist < 3) {
      phrase = `near ${primary.name}`;
    } else {
      phrase = `${miles} miles ${dirFromCity} of ${primary.name}`;
    }

    return {
      phrase,
      primary,
      distanceMi: primary.dist,
      direction: dirFromCity,
      nearest
    };
  }

  /** Exterior rings from Polygon or MultiPolygon (GeoJSON). */
  function geometryExteriorRings(geometry) {
    if (!geometry || !geometry.coordinates) return [];
    if (geometry.type === "Polygon") {
      return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
    }
    if (geometry.type === "MultiPolygon") {
      return (geometry.coordinates || [])
        .map((poly) => (poly && poly[0] ? poly[0] : null))
        .filter(Boolean);
    }
    return [];
  }

  function validLngLatPair(coord) {
    if (!coord || coord.length < 2) return null;
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return [lng, lat];
  }

  /**
   * Reduce a dense ring (marine zone coasts) to ≤ maxPoints for NWS LAT...LON.
   * Prefer turf.simplify / convex when available; else even sampling.
   */
  function simplifyRingForLatLon(ring, maxPoints = 20) {
    const cleaned = [];
    (ring || []).forEach((c) => {
      const p = validLngLatPair(c);
      if (p) cleaned.push(p);
    });
    if (cleaned.length >= 2) {
      const a = cleaned[0];
      const b = cleaned[cleaned.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) cleaned.pop();
    }
    if (cleaned.length <= maxPoints) return cleaned;
    const turf = global.turf;
    if (turf?.simplify) {
      try {
        const closed = cleaned.concat([cleaned[0]]);
        const simplified = turf.simplify(
          { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [closed] } },
          { tolerance: 0.02, highQuality: false }
        );
        const ring2 = simplified?.geometry?.coordinates?.[0] || [];
        const pts = [];
        ring2.forEach((c) => {
          const p = validLngLatPair(c);
          if (p) pts.push(p);
        });
        if (pts.length >= 2) {
          const a = pts[0];
          const b = pts[pts.length - 1];
          if (a[0] === b[0] && a[1] === b[1]) pts.pop();
        }
        if (pts.length >= 3 && pts.length <= maxPoints + 8) return pts.slice(0, maxPoints);
      } catch {
        /* fall through */
      }
    }
    if (turf?.convex && cleaned.length >= 3) {
      try {
        const fc = {
          type: "FeatureCollection",
          features: cleaned.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }))
        };
        const hull = turf.convex(fc);
        const ring2 = hull?.geometry?.coordinates?.[0] || [];
        const pts = [];
        ring2.forEach((c) => {
          const p = validLngLatPair(c);
          if (p) pts.push(p);
        });
        if (pts.length >= 2) {
          const a = pts[0];
          const b = pts[pts.length - 1];
          if (a[0] === b[0] && a[1] === b[1]) pts.pop();
        }
        if (pts.length >= 3) return pts.slice(0, maxPoints);
      } catch {
        /* fall through */
      }
    }
    // Even sample
    const out = [];
    const n = cleaned.length;
    const step = Math.max(1, Math.floor(n / maxPoints));
    for (let i = 0; i < n && out.length < maxPoints; i += step) {
      out.push(cleaned[i]);
    }
    if (out.length < 3 && cleaned.length >= 3) {
      return [cleaned[0], cleaned[Math.floor(n / 3)], cleaned[Math.floor((2 * n) / 3)]];
    }
    return out;
  }

  /**
   * NWS LAT...LON block. Handles Polygon and MultiPolygon (zone-based SMW).
   * Filters non-finite coords (prevents "LAT...LON NaN NaN...").
   */
  function formatLatLonLine(polygon) {
    if (!polygon) return "";
    const rings = geometryExteriorRings(polygon);
    if (!rings.length) return "";

    // Merge exteriors: for MultiPolygon zones use the longest ring after simplify,
    // or a convex hull of all valid vertices when several zones are selected.
    let points = [];
    if (rings.length === 1) {
      points = simplifyRingForLatLon(rings[0], 20);
    } else {
      const all = [];
      rings.forEach((ring) => {
        (ring || []).forEach((c) => {
          const p = validLngLatPair(c);
          if (p) all.push(p);
        });
      });
      points = simplifyRingForLatLon(all, 20);
      // If still huge/empty, fall back to bbox corners
      if (points.length < 3 && all.length) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        all.forEach(([lng, lat]) => {
          minX = Math.min(minX, lng);
          minY = Math.min(minY, lat);
          maxX = Math.max(maxX, lng);
          maxY = Math.max(maxY, lat);
        });
        if (Number.isFinite(minX)) {
          points = [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY]
          ];
        }
      }
    }

    points = points.filter((c) => validLngLatPair(c));
    if (points.length < 3) return "";

    // NWS style: LAT...LON 3593 8678 3588 8660 ...  (lat/lon hundredths, west lon abs)
    const pairs = points.map(([lng, lat]) => {
      const latC = Math.round(Math.abs(lat) * 100);
      const lonC = Math.round(Math.abs(lng) * 100);
      return `${latC} ${lonC}`;
    });
    let line = "LAT...LON";
    pairs.forEach((pair, i) => {
      if (i % 4 === 0) {
        line += i === 0 ? ` ${pair}` : `\n      ${pair}`;
      } else {
        line += ` ${pair}`;
      }
    });
    return line;
  }

  function formatTml(motion, locationPoint, frameTimeMs) {
    const d = frameTimeMs ? new Date(frameTimeMs) : new Date();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    let mot = "000DEG 0KT";
    if (motion && !motion.stationary) {
      const deg = Math.round(motion.bearing);
      const kts = Math.max(0, Math.round(motion.speedKts));
      mot = `${String(deg).padStart(3, "0")}DEG ${kts}KT`;
    }
    let loc = "0000 0000";
    if (locationPoint) {
      const latC = Math.round(Math.abs(locationPoint[1]) * 100);
      const lonC = Math.round(Math.abs(locationPoint[0]) * 100);
      loc = `${latC} ${lonC}`;
    }
    return `TIME...MOT...LOC ${hh}${mm}Z ${mot} ${loc}`;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatHeaderTime(date, office) {
    // e.g. 115 PM EDT Sat Jul 11 2026 — zone from office IANA (PHI → EDT/EST)
    const p = resolveOfficeLocalParts(date, office || {});
    const min = String(p.minutes || "00").padStart(2, "0");
    return `${p.hours}${min} ${p.ampm} ${p.tz} ${p.weekday} ${p.month} ${p.day} ${p.year}`;
  }

  function formatUntilTime(date, office) {
    const p = resolveOfficeLocalParts(date, office || {});
    const minNum = Number(p.minutes) || 0;
    const minPart = minNum === 0 ? "" : `:${String(minNum).padStart(2, "0")}`;
    // Expand short weekday if needed
    const longDays = {
      Sun: "Sunday",
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday"
    };
    const day = longDays[p.weekday] || p.weekday;
    return `${p.hours}${minPart} ${p.ampm} ${p.tz} ${day}`;
  }

  global.WarnGen = {
    OFFICE_BY_WFO,
    PRODUCT_META,
    HAIL_OPTIONS,
    WIND_OPTIONS,
    BASIS_OPTIONS,
    createState,
    nextEtn,
    formatEtn,
    formatProductId,
    getOffice,
    registerOffice,
    officeIanaTimeZone,
    resolveOfficeLocalParts,
    WFO_IANA,
    getProductMeta,
    formatHeaderTime,
    formatUntilTime,
    polygonToVertices,
    verticesToPolygon,
    haversineMiles,
    initialBearingDeg,
    compass16,
    roundTo5,
    roundUpToNextQuarterHour,
    computeExpireTime,
    pointInRing,
    geometryContainsPoint,
    featureIntersectsPolygon,
    resolveAreas,
    resolveMarineAreas,
    filterMarineZoneFeatures,
    marineZoneUgc,
    marineZoneRecord,
    marineZonesToPolygon,
    formatUgcLine,
    computeMotion,
    findLocationPhrase,
    formatLatLonLine,
    formatTml,
    formatHeaderTime,
    formatUntilTime,
    countyUgc,
    zoneUgc
  };
})(typeof window !== "undefined" ? window : globalThis);
