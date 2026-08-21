#!/usr/bin/env python3
import json, math, os, sys, tempfile
import numpy as np
from datetime import datetime, timezone
from osgeo import gdal, ogr, osr

gdal.UseExceptions()
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZONE_FILE=os.path.join(ROOT,"data/generated/awips/fire-zones.geojson")
MONITOR_FILE=os.path.join(ROOT,"data/wfo-monitor-results.json")
OUTPUT=os.path.join(ROOT,"data/fire-zone-extrema-shadow.json")

def open_grib(path):
    with open(path,"rb") as h: payload=h.read()
    if payload.startswith(b"GRIB"): return gdal.Open(path),None
    messages=[]; cursor=0
    while True:
        start=payload.find(b"GRIB",cursor)
        if start<0 or start+16>len(payload): break
        length=int.from_bytes(payload[start+8:start+16],"big") if payload[start+7]==2 else 0
        if length>=20 and start+length<=len(payload): messages.append(payload[start:start+length]); cursor=start+length
        else: cursor=start+4
    if not messages: raise RuntimeError(f"No GRIB messages in {path}")
    tmp=tempfile.NamedTemporaryFile(prefix="zone-shadow-",suffix=".grb2",delete=False)
    for message in messages: tmp.write(message)
    tmp.close(); return gdal.Open(tmp.name),tmp.name

def profile(p):
    state=str(p.get("STATE") or "").upper(); cwa=str(p.get("CWA") or p.get("WFO") or "").upper()
    if state in ("WA","OR") or state=="CA" and cwa in ("EKA","MFR"): return ("Pacific",25,10,20,4)
    if state in ("WY","CO"): return ("Central Rockies",15,25,25,3)
    if state in ("ID","NV","UT","MT"): return ("Arid West",15,math.inf,30,3)
    if state in ("AZ","NM","CA") or cwa in ("PSR","EPZ"): return ("Arid West",15,20,35,3)
    if state in ("ND","SD","NE","KS","OK","TX"): return ("Great Plains",15,20,35,3)
    if state in ("MN","IA","MO","WI","IL","IN","MI","OH"): return ("Midwest",25,20,math.inf,1)
    if state=="GA": return ("Southeast",25,15,25,1)
    if state=="AL": return ("Southeast",25,15,math.inf,4)
    if state=="FL": return ("Southeast",28,15,math.inf,1)
    if state=="MS": return ("Southeast",25,15,math.inf,1)
    if state=="LA": return ("Southeast",25,25,math.inf,1)
    if state in ("AR","TN","KY","SC","NC"): return ("Southeast",25,20,30,1)
    if state=="NY": return ("Eastern",30,25,25,2)
    if state in ("VA","MD","WV"): return ("Eastern",25 if state=="WV" else 30,20,math.inf,1)
    if state=="PA" or cwa=="PHI": return ("Eastern",30,20,20,1)
    return ("Eastern",30,25,25,3)

def band_map(ds):
    result={}
    for i in range(1,ds.RasterCount+1):
        band=ds.GetRasterBand(i); valid=str(band.GetMetadata().get("GRIB_VALID_TIME") or "").split()[0]
        if valid.isdigit(): result[int(valid)]=i
    return result

def main():
    if len(sys.argv)!=4: raise SystemExit("usage: run-fire-zone-extrema-shadow.py RH_GRIB WIND_GRIB GUST_GRIB")
    datasets=[]; temps=[]
    for path in sys.argv[1:]:
        ds,tmp=open_grib(path); datasets.append(ds); temps.append(tmp)
    rh_ds,wind_ds,gust_ds=datasets
    source=osr.SpatialReference(); source.ImportFromEPSG(4326); source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    target=osr.SpatialReference(); target.ImportFromWkt(rh_ds.GetProjection()); target.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    transform=osr.CoordinateTransformation(source,target); inverse=gdal.InvGeoTransform(rh_ds.GetGeoTransform())
    collection=json.load(open(ZONE_FILE,encoding="utf-8")); zones=[]
    for feature in collection.get("features",[]):
        p=feature.get("properties",{}); geometry=ogr.CreateGeometryFromJson(json.dumps(feature.get("geometry")))
        if not geometry: continue
        state=str(p.get("STATE") or "").upper()
        if state in ("AK","HI","GU","PR","AS","MP"): continue
        west,east,south,north=geometry.GetEnvelope(); points=[]
        lat=p.get("LAT"); lon=p.get("LON")
        if isinstance(lat,(int,float)) and isinstance(lon,(int,float)): points.append((lon,lat))
        for xi in range(1,10):
            for yi in range(1,10):
                x=west+(east-west)*xi/10; y=south+(north-south)*yi/10; point=ogr.Geometry(ogr.wkbPoint); point.AddPoint(x,y)
                if geometry.Contains(point): points.append((x,y))
        pixels=[]
        for lon,lat in points:
            x,y,_=transform.TransformPoint(float(lon),float(lat)); px,py=gdal.ApplyGeoTransform(inverse,x,y); key=(int(px),int(py))
            if 0<=key[0]<rh_ds.RasterXSize and 0<=key[1]<rh_ds.RasterYSize and key not in pixels: pixels.append(key)
        if not pixels: continue
        code=str(p.get("STATE_ZONE") or "").upper(); zones.append({"code":code,"name":str(p.get("NAME") or code),"wfo":str(p.get("CWA") or "").upper(),"profile":profile(p),"pixels":pixels,"hours":[]})
    maps=[band_map(ds) for ds in datasets]; valid_times=sorted(set(maps[0])&set(maps[1])&set(maps[2]))
    starts=[]; flat_x=[]; flat_y=[]
    for zone in zones:
        starts.append(len(flat_x))
        for px,py in zone["pixels"]: flat_x.append(px); flat_y.append(py)
    starts=np.asarray(starts,dtype=np.int64); flat_x=np.asarray(flat_x,dtype=np.int64); flat_y=np.asarray(flat_y,dtype=np.int64)
    for valid in valid_times:
        sampled=[]
        for field_index,(ds,mapping) in enumerate(zip(datasets,maps)):
            grid=ds.GetRasterBand(mapping[valid]).ReadAsArray(); values=grid[flat_y,flat_x].astype(float,copy=False)
            values=np.where(np.isfinite(values)&(values<999),values,np.nan)
            sampled.append(np.fmin.reduceat(values,starts) if field_index==0 else np.fmax.reduceat(values,starts)*2.23694)
        for zone_index,zone in enumerate(zones):
            minimum=float(sampled[0][zone_index]); maximum_wind=float(sampled[1][zone_index]); maximum_gust=float(sampled[2][zone_index])
            if not all(math.isfinite(v) for v in (minimum,maximum_wind,maximum_gust)): continue
            family,rh_limit,wind_limit,gust_limit,duration=zone["profile"]
            met=minimum<=rh_limit and (maximum_wind>=wind_limit or maximum_gust>=gust_limit)
            zone["hours"].append({"valid":valid,"minRh":round(minimum,1),"maxWindMph":round(maximum_wind,1),"maxGustMph":round(maximum_gust,1),"met":met})
    monitor=json.load(open(MONITOR_FILE,encoding="utf-8")); current={r.get("code"):r for r in monitor.get("results",[]) if r.get("zoneType")=="fire"}
    results=[]; now=datetime.now(timezone.utc).timestamp()
    for zone in zones:
        family,rh_limit,wind_limit,gust_limit,duration=zone["profile"]; run=best=0; first=None; previous=None; evidence=None
        if family=="Central Rockies":
            qualifying=[hour for hour in zone["hours"] if hour["met"]]
            for hour in qualifying:
                window=[item for item in qualifying if hour["valid"]-11*3600<=item["valid"]<=hour["valid"]]
                if len(window)>best: best=len(window); evidence=hour
                if len(window)>=duration and first is None: first=window[0]["valid"]
        else:
            for hour in zone["hours"]:
                consecutive=previous is not None and hour["valid"]-previous==3600
                run=run+1 if hour["met"] and (run==0 or consecutive) else (1 if hour["met"] else 0)
                if run>best: best=run; evidence=hour
                if run>=duration and first is None: first=hour["valid"]-(duration-1)*3600
                previous=hour["valid"]
        row=current.get(zone["code"],{}); nws=any(x in ("Red Flag Warning","Fire Weather Watch") for x in row.get("nwsAlerts",[])); proposed=best>=duration
        results.append({"code":zone["code"],"name":zone["name"],"wfo":zone["wfo"],"family":family,"samples":len(zone["pixels"]),"thresholds":{"rh":rh_limit,"wind":None if math.isinf(wind_limit) else wind_limit,"gust":None if math.isinf(gust_limit) else gust_limit,"duration":duration},"qualifyingHours":best,"firstQualifying":datetime.fromtimestamp(first,timezone.utc).isoformat() if first else None,"evidence":evidence,"proposed":proposed,"proposedProduct":("Red Flag Warning" if first and (first-now)/3600<=24 else "Fire Weather Watch") if proposed else None,"current":any(x in ("Red Flag Warning","Fire Weather Watch") for x in row.get("possibleAlerts",[])),"nwsConfirmed":nws})
    def count(fn): return sum(1 for r in results if fn(r))
    summary={"generatedAt":datetime.now(timezone.utc).isoformat(),"guidanceValidHours":len(valid_times),"zoneCount":len(results),"currentCandidates":count(lambda r:r["current"]),"proposedCandidates":count(lambda r:r["proposed"]),"retained":count(lambda r:r["current"] and r["proposed"]),"lost":count(lambda r:r["current"] and not r["proposed"]),"gained":count(lambda r:not r["current"] and r["proposed"]),"nwsConfirmedZones":count(lambda r:r["nwsConfirmed"]),"currentAndNws":count(lambda r:r["current"] and r["nwsConfirmed"]),"proposedAndNws":count(lambda r:r["proposed"] and r["nwsConfirmed"]),"confirmedLost":count(lambda r:r["current"] and r["nwsConfirmed"] and not r["proposed"]),"confirmedGained":count(lambda r:not r["current"] and r["nwsConfirmed"] and r["proposed"])}
    with open(OUTPUT,"w",encoding="utf-8") as h: json.dump({"summary":summary,"results":results},h,separators=(",",":"))
    print(json.dumps(summary,indent=2))
    for tmp in temps:
        if tmp: os.unlink(tmp)

if __name__=="__main__": main()
