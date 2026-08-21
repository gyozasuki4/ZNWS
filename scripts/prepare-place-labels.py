#!/usr/bin/env python3
"""
Build a dense US place catalog for map labels + WarnGen.

Sources (merged):
  1. US Census Gazetteer places — ranks / official incorporated places & CDPs
  2. USGS GNIS National File — Populated Place (dense towns, hamlets, communities)

Census wins on name collision (better rank). GNIS-only rows become rank 4–5.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path


DEFAULT_GAZETTEER_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip"
)
# USGS Geographic Names Information System — national domestic names
DEFAULT_GNIS_URL = "https://geonames.usgs.gov/docs/stategaz/NationalFile.zip"
# GeoNames US dump (dense P-class settlements) — reliable fallback / primary dense source
DEFAULT_GEONAMES_URL = "https://download.geonames.org/export/dump/US.zip"
OUTPUT_FILE = Path("data/generated/base/cities.geojson")

# GeoNames admin1 FIPS → USPS
FIPS_TO_USPS = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    "10": "DE",
    "11": "DC",
    "12": "FL",
    "13": "GA",
    "15": "HI",
    "16": "ID",
    "17": "IL",
    "18": "IN",
    "19": "IA",
    "20": "KS",
    "21": "KY",
    "22": "LA",
    "23": "ME",
    "24": "MD",
    "25": "MA",
    "26": "MI",
    "27": "MN",
    "28": "MS",
    "29": "MO",
    "30": "MT",
    "31": "NE",
    "32": "NV",
    "33": "NH",
    "34": "NJ",
    "35": "NM",
    "36": "NY",
    "37": "NC",
    "38": "ND",
    "39": "OH",
    "40": "OK",
    "41": "OR",
    "42": "PA",
    "44": "RI",
    "45": "SC",
    "46": "SD",
    "47": "TN",
    "48": "TX",
    "49": "UT",
    "50": "VT",
    "51": "VA",
    "53": "WA",
    "54": "WV",
    "55": "WI",
    "56": "WY",
    "60": "AS",
    "66": "GU",
    "69": "MP",
    "72": "PR",
    "78": "VI",
}

# GeoNames feature codes for settlements we want on the map / WarnGen
GEONAMES_P_CODES = {
    "PPL",
    "PPLA",
    "PPLA2",
    "PPLA3",
    "PPLA4",
    "PPLC",
    "PPLG",
    "PPLH",
    "PPLL",
    "PPLQ",
    "PPLR",
    "PPLS",
    "PPLW",
    "PPLX",
    "STLMT",
}

# Name + state so small towns (e.g. Charlotte TN) do not inherit metro rank.
MAJOR_PLACES = {
    ("Atlanta", "GA"),
    ("Austin", "TX"),
    ("Baltimore", "MD"),
    ("Birmingham", "AL"),
    ("Bismarck", "ND"),
    ("Boston", "MA"),
    ("Buffalo", "NY"),
    ("Casper", "WY"),
    ("Charlotte", "NC"),
    ("Chicago", "IL"),
    ("Cincinnati", "OH"),
    ("Cleveland", "OH"),
    ("Columbus", "OH"),
    ("Dallas", "TX"),
    ("Denver", "CO"),
    ("Des Moines", "IA"),
    ("Detroit", "MI"),
    ("Houston", "TX"),
    ("Indianapolis", "IN"),
    ("Jackson", "MS"),
    ("Jacksonville", "FL"),
    ("Kansas City", "MO"),
    ("Las Vegas", "NV"),
    ("Little Rock", "AR"),
    ("Los Angeles", "CA"),
    ("Louisville", "KY"),
    ("Memphis", "TN"),
    ("Miami", "FL"),
    ("Milwaukee", "WI"),
    ("Minneapolis", "MN"),
    ("Minot", "ND"),
    ("Nashville", "TN"),
    ("New Orleans", "LA"),
    ("New York", "NY"),
    ("Oklahoma City", "OK"),
    ("Omaha", "NE"),
    ("Philadelphia", "PA"),
    ("Phoenix", "AZ"),
    ("Pittsburgh", "PA"),
    ("Portland", "OR"),
    ("Raleigh", "NC"),
    ("Riverton", "WY"),
    ("Salt Lake City", "UT"),
    ("San Antonio", "TX"),
    ("San Diego", "CA"),
    ("San Francisco", "CA"),
    ("Seattle", "WA"),
    ("St. Louis", "MO"),
    ("Tampa", "FL"),
    ("Tulsa", "OK"),
    ("Washington", "DC"),
}

# Extra regional hubs that should stay prominent on the ops map.
REGIONAL_PLACES = {
    ("Clarksville", "TN"),
    ("Murfreesboro", "TN"),
    ("Chattanooga", "TN"),
    ("Knoxville", "TN"),
    ("Bowling Green", "KY"),
    ("Huntsville", "AL"),
    ("Franklin", "TN"),
    ("Columbia", "TN"),
    ("Dickson", "TN"),
    ("Spring Hill", "TN"),
    ("Brentwood", "TN"),
    ("Hendersonville", "TN"),
    ("Gallatin", "TN"),
    ("Lebanon", "TN"),
    ("Smyrna", "TN"),
    ("Cookeville", "TN"),
    ("Jackson", "TN"),
    ("Casper", "WY"),
    ("Riverton", "WY"),
    ("Williston", "ND"),
    ("Dickinson", "ND"),
    ("Minot", "ND"),
}

PLACE_SUFFIX_PATTERN = re.compile(
    r"\s+(city|town|village|borough|municipality|CDP|urban county|metro township|"
    r"charter township|balance|consolidated government|"
    r"metropolitan government.*|metro government.*)$",
    re.IGNORECASE,
)

DISPLAY_NAME_OVERRIDES = {
    ("Nashville-Davidson metropolitan government (balance)", "TN"): "Nashville",
    ("Louisville/Jefferson County metro government (balance)", "KY"): "Louisville",
    ("Indianapolis city (balance)", "IN"): "Indianapolis",
    ("Augusta-Richmond County consolidated government (balance)", "GA"): "Augusta",
    ("Athens-Clarke County unified government (balance)", "GA"): "Athens",
    ("Lexington-Fayette urban county", "KY"): "Lexington",
}

# Skip non-settlement / noise that pollutes WarnGen city lists
DENSE_SKIP_NAME_RE = re.compile(
    r"\b(trailer park|mobile home|subdivision|historic|ruins|ghost|abandoned|"
    r"mine|campground|church|school|cemetery|airport|historical)\b|"
    r"\(historical\)|"
    r"\b(estates|plantation|village apartments|mobile home park)\b",
    re.IGNORECASE,
)
# GeoNames codes for abandoned / historical settlements
GEONAMES_SKIP_CODES = {"PPLH", "PPLQ"}

# CONUS + AK + HI + PR + VI — drop overseas territories if desired via env
KEEP_STATES = None  # None = all USPS codes present in sources


def usage():
    print(
        "Usage: prepare-place-labels.py [census_zip_or_url] [output_geojson]\n"
        "  Optional env:\n"
        "    GAZETTEER_URL  Census places ZIP/URL\n"
        "    GNIS_URL       USGS GNIS NationalFile ZIP/URL\n"
        "    SKIP_GNIS=1    Census only\n",
        file=sys.stderr,
    )


def download_or_open_zip(source: str):
    if re.match(r"https?://", source):
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as temp_file:
            temp_path = Path(temp_file.name)
        try:
            print(f"Downloading {source}", file=sys.stderr)
            urllib.request.urlretrieve(source, temp_path)
            return zipfile.ZipFile(temp_path), temp_path
        except Exception:
            temp_path.unlink(missing_ok=True)
            raise
    return zipfile.ZipFile(source), None


def clean_place_name(name: str, state: str = "") -> str:
    override = DISPLAY_NAME_OVERRIDES.get((name.strip(), state.strip().upper()))
    if override:
        return override

    cleaned = PLACE_SUFFIX_PATTERN.sub("", name).strip()
    cleaned = re.sub(r"\s+\(balance\)$", "", cleaned, flags=re.IGNORECASE).strip()

    if cleaned.startswith("Nashville-Davidson"):
        return "Nashville"
    if cleaned.startswith("Louisville/Jefferson"):
        return "Louisville"

    return cleaned


def normalize_key(name: str, state: str) -> str:
    n = re.sub(r"[^a-z0-9]+", "", (name or "").lower())
    return f"{n}|{(state or '').upper()}"


def parse_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def place_rank_census(name, land_sqmi, lsad, state, clean_name) -> int:
    if (clean_name, state) in MAJOR_PLACES:
        return 1
    if (clean_name, state) in REGIONAL_PLACES:
        return 2
    if land_sqmi >= 75:
        return 2
    if land_sqmi >= 15:
        return 3
    lsad_lower = (lsad or "").lower()
    if lsad_lower in {"city", "town", "village", "borough", "municipality", "25", "43", "47", "21", "06"} and land_sqmi >= 4:
        return 3
    if land_sqmi >= 2:
        return 3
    return 4


def minzoom_for_rank(rank: int) -> float:
    return {
        1: 3,
        2: 5,
        3: 6,
        4: 7.2,
        5: 8.5,
    }.get(rank, 9)


def make_feature(name, state, lon, lat, rank, source, full_name=None, extra=None):
    props = {
        "name": name,
        "fullName": full_name or name,
        "state": state,
        "rank": rank,
        "minzoom": minzoom_for_rank(rank),
        "source": source,
    }
    if extra:
        props.update(extra)
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {
            "type": "Point",
            "coordinates": [round(lon, 6), round(lat, 6)],
        },
    }


def load_census_places(source: str) -> list:
    archive, temp_path = download_or_open_zip(source)
    features = []
    try:
        text_members = [name for name in archive.namelist() if name.lower().endswith(".txt")]
        if not text_members:
            raise RuntimeError("Census gazetteer ZIP did not contain a .txt file")

        with archive.open(text_members[0]) as member:
            def cleaned_rows():
                for line in member:
                    yield line.decode("utf-8-sig").rstrip("\n\r")

            rows = csv.DictReader(cleaned_rows(), delimiter="\t")
            if rows.fieldnames:
                rows.fieldnames = [name.strip() if name else name for name in rows.fieldnames]

            for raw_row in rows:
                row = {
                    (key.strip() if key else key): (value.strip() if isinstance(value, str) else value)
                    for key, value in raw_row.items()
                }
                lon = parse_float(row.get("INTPTLONG"))
                lat = parse_float(row.get("INTPTLAT"))
                if not (-180 <= lon <= 180 and -90 <= lat <= 90) or (abs(lon) < 0.05 and abs(lat) < 1):
                    continue

                name = (row.get("NAME") or "").strip()
                state = (row.get("USPS") or "").strip().upper()
                if not name or not state:
                    continue
                lsad = (row.get("LSAD") or "").strip()
                land_sqmi = parse_float(row.get("ALAND_SQMI"))
                clean_name = clean_place_name(name, state)
                rank = place_rank_census(name, land_sqmi, lsad, state, clean_name)

                features.append(
                    make_feature(
                        clean_name,
                        state,
                        lon,
                        lat,
                        rank,
                        "census",
                        full_name=name,
                        extra={
                            "geoid": (row.get("GEOID") or "").strip(),
                            "lsad": lsad,
                            "landSqMi": round(land_sqmi, 3),
                        },
                    )
                )
    finally:
        archive.close()
        if temp_path:
            temp_path.unlink(missing_ok=True)

    print(f"Census places: {len(features)}", file=sys.stderr)
    return features


def find_gnis_txt_member(archive: zipfile.ZipFile) -> str:
    members = archive.namelist()
    # Prefer NationalFile*.txt
    for name in members:
        base = Path(name).name.lower()
        if base.startswith("nationalfile") and base.endswith(".txt"):
            return name
    for name in members:
        if name.lower().endswith(".txt") and "national" in name.lower():
            return name
    text = [n for n in members if n.lower().endswith(".txt")]
    if not text:
        raise RuntimeError("GNIS ZIP has no .txt member")
    return text[0]


def load_gnis_populated(source: str) -> list:
    archive, temp_path = download_or_open_zip(source)
    features = []
    try:
        member_name = find_gnis_txt_member(archive)
        print(f"GNIS member: {member_name}", file=sys.stderr)
        with archive.open(member_name) as member:
            # GNIS uses pipe-delimited
            text_stream = (line.decode("latin-1").rstrip("\n\r") for line in member)
            # Peek header
            first = next(text_stream, "")
            if "|" not in first:
                raise RuntimeError("Unexpected GNIS format (expected pipe-delimited)")

            # Re-build iterator with header
            def all_lines():
                yield first
                yield from text_stream

            reader = csv.DictReader(all_lines(), delimiter="|")
            # Normalize headers
            if reader.fieldnames:
                reader.fieldnames = [h.strip() if h else h for h in reader.fieldnames]

            for raw in reader:
                row = {(k.strip() if k else k): (v.strip() if isinstance(v, str) else v) for k, v in raw.items()}
                fclass = (row.get("FEATURE_CLASS") or row.get("feature_class") or "").strip()
                if fclass != "Populated Place":
                    continue

                name = (row.get("FEATURE_NAME") or row.get("feature_name") or "").strip()
                state = (row.get("STATE_ALPHA") or row.get("state_alpha") or "").strip().upper()
                if not name or not state or len(state) != 2:
                    continue
                if DENSE_SKIP_NAME_RE.search(name):
                    continue

                lat = parse_float(row.get("PRIM_LAT_DEC") or row.get("prim_lat_dec"))
                lon = parse_float(row.get("PRIM_LONG_DEC") or row.get("prim_long_dec"))
                if not (-180 <= lon <= 180 and -90 <= lat <= 90) or abs(lon) < 0.05:
                    continue
                # GNIS sometimes has 0,0 for unknown
                if abs(lat) < 0.05:
                    continue

                clean = clean_place_name(name, state)
                if DENSE_SKIP_NAME_RE.search(clean):
                    continue
                # Tiny / unincorporated → rank 5; named communities → 4
                # (Census match will upgrade later)
                rank = 5 if len(clean) <= 3 else 4

                features.append(
                    make_feature(
                        clean,
                        state,
                        lon,
                        lat,
                        rank,
                        "gnis",
                        full_name=name,
                        extra={
                            "gnisId": (row.get("FEATURE_ID") or row.get("feature_id") or "").strip(),
                            "county": (row.get("COUNTY_NAME") or row.get("county_name") or "").strip(),
                        },
                    )
                )
    finally:
        archive.close()
        if temp_path:
            temp_path.unlink(missing_ok=True)

    print(f"GNIS populated places: {len(features)}", file=sys.stderr)
    return features


def merge_places(base_features: list, dense_features: list, dense_label: str = "dense") -> list:
    """Census (base) wins on name+state collision; dense source fills gaps."""
    by_key: dict[str, dict] = {}

    for feat in base_features:
        p = feat["properties"]
        key = normalize_key(p["name"], p["state"])
        by_key[key] = feat

    added = 0
    clashed = 0
    for feat in dense_features:
        p = feat["properties"]
        key = normalize_key(p["name"], p["state"])
        if key in by_key:
            existing = by_key[key]
            # Copy useful ids onto census row
            for field in ("gnisId", "geonameId", "population", "county"):
                if p.get(field) and not existing["properties"].get(field):
                    existing["properties"][field] = p[field]
            clashed += 1
            continue
        by_key[key] = feat
        added += 1

    features = list(by_key.values())
    features.sort(
        key=lambda f: (
            f["properties"]["rank"],
            f["properties"]["state"],
            f["properties"]["name"],
        )
    )
    print(
        f"Merged: {len(features)} total ({dense_label}-only added={added}, census kept on clash={clashed})",
        file=sys.stderr,
    )
    return features


def feature_lon(feature) -> float:
    coords = (feature.get("geometry") or {}).get("coordinates") or []
    if not coords:
        return 0.0
    try:
        return float(coords[0])
    except (TypeError, ValueError):
        return 0.0


def validate_places(features: list):
    if not features:
        raise RuntimeError("No place features generated")

    zero_lon = sum(1 for f in features if abs(feature_lon(f)) < 0.05)
    if zero_lon == len(features):
        raise RuntimeError("All longitudes ~0 — parse failure")

    ranks: dict[int, int] = {}
    for f in features:
        r = int(f["properties"].get("rank") or 4)
        ranks[r] = ranks.get(r, 0) + 1

    sample = next(f for f in features if abs(feature_lon(f)) > 0.05)
    print(
        f"Validation OK: {len(features)} places, zero-lon={zero_lon}, ranks={ranks}, "
        f"sample={sample['properties']['name']} {sample['properties']['state']} "
        f"@ {sample['geometry']['coordinates']}",
        file=sys.stderr,
    )


def load_geonames_us(source: str) -> list:
    """Dense US settlements from GeoNames (feature class P)."""
    archive, temp_path = download_or_open_zip(source)
    features = []
    try:
        # US.zip contains US.txt
        member = None
        for name in archive.namelist():
            if Path(name).name.upper() == "US.TXT":
                member = name
                break
        if not member:
            txts = [n for n in archive.namelist() if n.lower().endswith(".txt")]
            if not txts:
                raise RuntimeError("GeoNames US ZIP has no .txt")
            member = txts[0]
        print(f"GeoNames member: {member}", file=sys.stderr)

        with archive.open(member) as fh:
            for raw in fh:
                line = raw.decode("utf-8", errors="replace").rstrip("\n\r")
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) < 15:
                    continue
                # geonameid, name, asciiname, alternatenames, lat, lon, fclass, fcode, country, cc2, admin1, admin2, admin3, admin4, population, ...
                name = parts[1].strip()
                ascii_name = parts[2].strip() or name
                lat = parse_float(parts[4])
                lon = parse_float(parts[5])
                fclass = parts[6].strip()
                fcode = parts[7].strip()
                country = parts[8].strip()
                admin1 = parts[10].strip()
                try:
                    population = int(float(parts[14] or 0))
                except (TypeError, ValueError):
                    population = 0

                if country != "US" or fclass != "P" or fcode not in GEONAMES_P_CODES:
                    continue
                if fcode in GEONAMES_SKIP_CODES:
                    continue
                if not name or not (-180 <= lon <= 180 and -90 <= lat <= 90) or abs(lon) < 0.05:
                    continue
                if DENSE_SKIP_NAME_RE.search(name) or DENSE_SKIP_NAME_RE.search(ascii_name or ""):
                    continue

                state = FIPS_TO_USPS.get(admin1.zfill(2) if admin1.isdigit() else admin1, "")
                if not state:
                    # Some rows use USPS already
                    if len(admin1) == 2 and admin1.isalpha():
                        state = admin1.upper()
                    else:
                        continue

                clean = clean_place_name(ascii_name or name, state)
                if DENSE_SKIP_NAME_RE.search(clean):
                    continue

                # Rank by population / feature code when Census didn't claim this name
                if (clean, state) in MAJOR_PLACES:
                    rank = 1
                elif (clean, state) in REGIONAL_PLACES or fcode in {"PPLA", "PPLA2"} or population >= 50000:
                    rank = 2
                elif population >= 5000 or fcode in {"PPLA3", "PPLA4"}:
                    rank = 3
                elif population >= 200 or fcode == "PPL":
                    rank = 4
                else:
                    # Very small / unpopulated named places
                    rank = 5

                features.append(
                    make_feature(
                        clean,
                        state,
                        lon,
                        lat,
                        rank,
                        "geonames",
                        full_name=name,
                        extra={
                            "geonameId": parts[0].strip(),
                            "population": population,
                            "fcode": fcode,
                        },
                    )
                )
    finally:
        archive.close()
        if temp_path:
            temp_path.unlink(missing_ok=True)

    print(f"GeoNames US settlements: {len(features)}", file=sys.stderr)
    return features


def main():
    if len(sys.argv) > 3 or (len(sys.argv) > 1 and sys.argv[1] in {"-h", "--help"}):
        usage()
        sys.exit(0 if len(sys.argv) > 1 else 1)

    census_source = (
        sys.argv[1]
        if len(sys.argv) >= 2
        else os.environ.get("GAZETTEER_URL", DEFAULT_GAZETTEER_URL)
    )
    output_file = Path(sys.argv[2]) if len(sys.argv) == 3 else OUTPUT_FILE
    gnis_source = os.environ.get("GNIS_URL", DEFAULT_GNIS_URL)
    geonames_source = os.environ.get("GEONAMES_URL", DEFAULT_GEONAMES_URL)
    skip_dense = os.environ.get("SKIP_GNIS", os.environ.get("SKIP_DENSE", "")).strip() in {
        "1",
        "true",
        "yes",
    }
    dense_pref = (os.environ.get("DENSE_SOURCE") or "auto").strip().lower()  # auto|gnis|geonames

    census = load_census_places(census_source)
    if skip_dense:
        features = census
        print("SKIP_DENSE set — census only", file=sys.stderr)
    else:
        dense = []
        dense_label = "dense"
        errors = []

        def try_gnis():
            return load_gnis_populated(gnis_source), "gnis"

        def try_geonames():
            return load_geonames_us(geonames_source), "geonames"

        order = []
        if dense_pref == "gnis":
            order = [try_gnis, try_geonames]
        elif dense_pref == "geonames":
            order = [try_geonames, try_gnis]
        else:
            # auto: GeoNames first (more reliable host), then GNIS
            order = [try_geonames, try_gnis]

        for loader in order:
            try:
                dense, dense_label = loader()
                if dense:
                    break
            except Exception as err:
                errors.append(str(err))
                print(f"WARNING: dense source failed ({err})", file=sys.stderr)

        if dense:
            features = merge_places(census, dense, dense_label=dense_label)
        else:
            print(
                f"WARNING: all dense sources failed ({'; '.join(errors)}); census-only",
                file=sys.stderr,
            )
            features = census

    validate_places(features)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    # Compact JSON for size
    fc = {"type": "FeatureCollection", "features": features}
    output_file.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(features)} place labels to {output_file} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
