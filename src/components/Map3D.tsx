import * as React from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import bbox from "@turf/bbox";
import length from '@turf/length';
import lineSliceAlong from '@turf/line-slice-along';
import { lineString, point } from '@turf/helpers';
import { lerp, interpolateCoords, averageBearing, getMapStyle } from "./mapUtils";
import HotkeyOverlay from "./HotkeyOverlay";
import useMapLibreAttributionCss from "./useMapLibreAttributionCss";

// Props: startMile, endMile, trailGeoJson (GeoJSON for the PCT trail)
type Map3DProps = {
  startMile: number;
  endMile: number;
  trailGeoJson: any;
  visualizerIdx?: number | "start" | "end" | null;
  basemap?: "outdoor" | "satellite" | "streets" | "topo" | "dotshading" | "slopeshading" | "aspectshading";
  overlayHiker?: boolean;
  showTrail?: boolean;
  trailColor?: string;
  showMileMarkers?: boolean;
  showPCTPOI?: boolean;
  showSkybox?: boolean;
  cameraAttached?: boolean;
  waypoints?: any; // GeoJSON FeatureCollection of Halfmile trail waypoints
  pctMileStart?: number; // actual PCT mile at the section start, for accurate mile labels
};


const Map3D: React.FC<Map3DProps> = ({ startMile, endMile, trailGeoJson, visualizerIdx, basemap = "outdoor", overlayHiker, showTrail = true, trailColor = "#fff", showMileMarkers = true, showPCTPOI = true, showSkybox, waypoints, pctMileStart = 0 }) => {
  useMapLibreAttributionCss();

  // 8-bit hiker SVGs (two frames, green theme)
  const hikerSVGs = [
    `data:image/svg+xml;utf8,<svg width='32' height='32' xmlns='http://www.w3.org/2000/svg'><rect width='32' height='32' fill='none'/><rect x='13' y='6' width='6' height='6' fill='%2314532d'/><rect x='15' y='12' width='2' height='8' fill='%237adf8c'/><rect x='13' y='20' width='2' height='6' fill='%23b6f5c1'/><rect x='17' y='20' width='2' height='6' fill='%23b6f5c1'/><rect x='11' y='14' width='2' height='4' fill='%237adf8c'/></svg>`,
    `data:image/svg+xml;utf8,<svg width='32' height='32' xmlns='http://www.w3.org/2000/svg'><rect width='32' height='32' fill='none'/><rect x='13' y='6' width='6' height='6' fill='%2314532d'/><rect x='15' y='12' width='2' height='8' fill='%237adf8c'/><rect x='13' y='22' width='2' height='4' fill='%23b6f5c1'/><rect x='17' y='20' width='2' height='6' fill='%23b6f5c1'/><rect x='19' y='14' width='2' height='4' fill='%237adf8c'/></svg>`
  ];

  const mapContainer = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const [mileLabel, setMileLabel] = React.useState<string | null>(null);
  const [hikerFrame, setHikerFrame] = React.useState(0);
  const [hikerLabel, setHikerLabel] = React.useState<string | null>(null);
  // Track map loaded state
  const [mapLoaded, setMapLoaded] = React.useState(false);

  // Hotkeys/modal state
  const [showHotkeys, setShowHotkeys] = React.useState(false);
  const [localBasemap, setLocalBasemap] = React.useState(basemap);
  const [localShowTrail, setLocalShowTrail] = React.useState(showTrail);
  const [localShowMileMarkers, setLocalShowMileMarkers] = React.useState(showMileMarkers);
  const [localShowPCTPOI, setLocalShowPCTPOI] = React.useState(showPCTPOI);
  const [localOverlayHiker, setLocalOverlayHiker] = React.useState(overlayHiker);
  const [localVisualizerIdx, setLocalVisualizerIdx] = React.useState(visualizerIdx);
  const [visualizerPlaying, setVisualizerPlaying] = React.useState(false);

  // Basemap cycling
  const basemapOptions = ["outdoor", "satellite", "streets", "topo", "dotshading", "slopeshading", "aspectshading"];
  const cycleBasemap = () => {
    const idx = basemapOptions.indexOf(localBasemap);
    setLocalBasemap(basemapOptions[(idx + 1) % basemapOptions.length] as typeof localBasemap);
  };

  // Visualizer play/pause effect
  React.useEffect(() => {
    if (!visualizerPlaying) return;
    let stopped = false;
    function step() {
      setLocalVisualizerIdx(idx => {
        if (typeof idx !== 'number') return startMile;
        if (idx < endMile - 1) {
          return idx + 1;
        } else {
          setVisualizerPlaying(false);
          stopped = true;
          return idx;
        }
      });
      if (!stopped) {
        setTimeout(step, 1000);
      }
    }
    const timeout = setTimeout(step, 1000);
    return () => clearTimeout(timeout);
  }, [visualizerPlaying, startMile, endMile]);

  // Sync props/state
  React.useEffect(() => { setLocalBasemap(basemap); }, [basemap]);
  React.useEffect(() => { setLocalShowTrail(showTrail); }, [showTrail]);
  React.useEffect(() => { setLocalShowMileMarkers(showMileMarkers); }, [showMileMarkers]);
  React.useEffect(() => { setLocalShowPCTPOI(showPCTPOI); }, [showPCTPOI]);
  React.useEffect(() => { setLocalOverlayHiker(overlayHiker); }, [overlayHiker]);
  React.useEffect(() => { setLocalVisualizerIdx(visualizerIdx); }, [visualizerIdx]);

  // Only create/destroy map on basemap or trailGeoJson change
  React.useEffect(() => {
    let prevView: { center: [number, number]; zoom: number; pitch: number; bearing: number } | null = null;
    if (mapRef.current) {
      // Save current view before removing
      prevView = {
        center: mapRef.current.getCenter().toArray() as [number, number],
        zoom: mapRef.current.getZoom(),
        pitch: mapRef.current.getPitch(),
        bearing: mapRef.current.getBearing(),
      };
      mapRef.current.remove();
      mapRef.current = null;
    }
    setMapLoaded(false);
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(localBasemap) as any,
      center: prevView ? prevView.center : [-120.0, 47.5],
      zoom: prevView ? prevView.zoom : 8,
      pitch: prevView ? prevView.pitch : 45,
      bearing: prevView ? prevView.bearing : -20,
      maxZoom: 18,
      maxPitch: 85,
    });
    mapRef.current = map;
    map.on("load", () => {
      setMapLoaded(true);
      // Only fit bounds if this is the initial load (not a basemap change)
      if (!prevView && trailGeoJson) {
        const coords = trailGeoJson.features[0]?.geometry?.coordinates || [];
        if (coords.length > 0) {
          const lats = coords.map((c: any) => c[1]);
          const lngs = coords.map((c: any) => c[0]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          map.fitBounds([
            [minLng, minLat],
            [maxLng, maxLat],
          ], { padding: 40, pitch: 45, bearing: -20, offset: mapOffset });
        }
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [localBasemap, trailGeoJson]);

  // Trail layer update (runs only when map is loaded and geojson is available)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !trailGeoJson) return;
    const color = trailColor || '#fff';
    if (localShowTrail) {
      if (!map.getSource("pct-trail")) {
        map.addSource("pct-trail", { type: "geojson", data: trailGeoJson });
        map.addLayer({
          id: "pct-trail-line",
          type: "line",
          source: "pct-trail",
          paint: { "line-color": color, "line-width": 4 },
        });
      } else {
        (map.getSource("pct-trail") as any).setData(trailGeoJson);
        map.setPaintProperty("pct-trail-line", "line-color", color);
      }
    } else {
      if (map.getLayer("pct-trail-line")) map.removeLayer("pct-trail-line");
      if (map.getSource("pct-trail")) map.removeSource("pct-trail");
    }
  }, [localShowTrail, trailColor, trailGeoJson, mapLoaded]);

  // Mile markers update (runs only when map is loaded and geojson is available)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !trailGeoJson) return;
    // Remove layer/source if present, then re-add if showMileMarkers
    if (map.getLayer("mile-markers-layer")) map.removeLayer("mile-markers-layer");
    if (map.getSource("mile-markers")) map.removeSource("mile-markers");
    if (localShowMileMarkers) {
      const coords = trailGeoJson.features[0]?.geometry?.coordinates || [];
      if (coords.length < 2) return;
      const line = lineString(coords);
      const totalMiles = length(line, { units: 'miles' });
      const markerFeatures = [];
      for (let m = 0; m <= Math.floor(totalMiles); m++) {
        const sliced = lineSliceAlong(line, m, m + 0.01, { units: 'miles' });
        const markerCoord = sliced.geometry.coordinates[0];
        if (markerCoord) {
          markerFeatures.push({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: markerCoord },
            properties: { mile: Math.round(pctMileStart + m) },
          });
        }
      }
      map.addSource("mile-markers", { type: "geojson", data: { type: "FeatureCollection", features: markerFeatures } });
      map.addLayer({
        id: "mile-markers-layer",
        type: "symbol",
        source: "mile-markers",
        layout: {
          "text-field": ["get", "mile"],
          "text-size": 13,
          "text-offset": [1.2, 0],
          "text-anchor": "left",
          "text-allow-overlap": false,
          "text-optional": true,
        },
        paint: {
          "text-color": "#e6ffe6",
          "text-halo-color": "#10281a",
          "text-halo-width": 2,
        },
      }, 'pct-trail-line');
    }
  }, [localShowMileMarkers, trailGeoJson, mapLoaded]);

  // PCT POI update (runs only when map is loaded and geojson is available)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !trailGeoJson) return;
    // Remove layer/source if present, then re-add if showPCTPOI
    if (map.getLayer("pct-poi-layer")) map.removeLayer("pct-poi-layer");
    if (map.getSource("pct-poi")) map.removeSource("pct-poi");
    if (localShowPCTPOI) {
      const poiFeatures = [
        // --- Harts Pass area (access + landmarks) ---
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6699, 48.7206] },
          properties: { name: "Harts Pass Campground" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6643, 48.7277] },
          properties: { name: "Harts Pass / Upper Trailhead (approx)" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6805866, 48.7416360] },
          properties: { name: "Slate Peak" }
        },

        // --- Just south of Harts Pass (still “nearby” PCT highlights) ---
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.71750, 48.67472] },
          properties: { name: "Grasshopper Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7001052, 48.5545805] },
          properties: { name: "Cutthroat Pass" }
        },

        // --- Seven Pass Loop / PCT north corridor highlights (Pasayten Peak quad features) ---
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6353847, 48.7537479] },
          properties: { name: "Robinson Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7021, 48.7612] },
          properties: { name: "Buffalo Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7104, 48.7718] },
          properties: { name: "Windy Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7140, 48.7693] },
          properties: { name: "Indiana Basin" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7337, 48.7849] },
          properties: { name: "Foggy Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7357, 48.7937] },
          properties: { name: "Jim Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7296, 48.7957] },
          properties: { name: "Oregon Basin" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7301, 48.8043] },
          properties: { name: "Devils Backbone" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7354, 48.8396] },
          properties: { name: "Holman Pass (PCT ↔ PNT junction area)" }
        },

        // --- Extra lakes/peaks that look great as “interest pins” ---
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6993, 48.8387] },
          properties: { name: "Holman Campground / Locale" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7376, 48.8540] },
          properties: { name: "Goat Lakes" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6454, 48.8478] },
          properties: { name: "Buckskin Lake" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6629, 48.8054] },
          properties: { name: "Silver Pass" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6599, 48.7846] },
          properties: { name: "Silver Lake" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6704, 48.7960] },
          properties: { name: "Pasayten Peak" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7254, 48.7737] },
          properties: { name: "Tamarack Peak" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.6851, 48.8312] },
          properties: { name: "Threemile Point" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.7329, 48.8676] },
          properties: { name: "Holman Peak" }
        },

        // --- Northern Terminus / border ---
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.8028833, 48.99945] },
          properties: { name: "PCT Northern Terminus Monument (approx)" }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-120.8028833, 48.99945] },
          properties: { name: "Boundary Monument 78 (approx)" }
        }
      ].map(f => ({ ...f, type: "Feature" as const, geometry: { ...f.geometry, type: "Point" as const } }));

      map.addSource("pct-poi", { type: "geojson", data: { type: "FeatureCollection", features: poiFeatures } });
      map.addLayer({
        id: "pct-poi-layer",
        type: "symbol",
        source: "pct-poi",
        layout: {
          "icon-image": ["coalesce", ["image", "marker-15"], ""],
          "text-field": ["get", "name"],
          "text-size": 14,
          "text-offset": [0, 1.2],
          "icon-size": 1.2,
        },
        paint: {
          "text-color": "#ffe6b6",
          "text-halo-color": "#14532d",
          "text-halo-width": 2,
        },
      }, 'pct-trail-line');
    }
  }, [localShowPCTPOI, trailGeoJson, mapLoaded]);

  // Halfmile waypoints layer
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (map.getLayer("halfmile-waypoints-layer")) map.removeLayer("halfmile-waypoints-layer");
    if (map.getSource("halfmile-waypoints")) map.removeSource("halfmile-waypoints");
    if (!waypoints || !waypoints.features?.length) return;

    // Filter to meaningful landmark types (skip numbered route markers)
    const SKIP_PATTERN = /^\d+(-\d+)?$/;
    const meaningful = {
      ...waypoints,
      features: waypoints.features.filter((f: any) => {
        const name: string = f.properties?.name ?? '';
        return !SKIP_PATTERN.test(name);
      }),
    };

    map.addSource("halfmile-waypoints", { type: "geojson", data: meaningful });
    map.addLayer({
      id: "halfmile-waypoints-layer",
      type: "symbol",
      source: "halfmile-waypoints",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-optional": true,
        "text-allow-overlap": false,
        "icon-image": ["coalesce", ["image", "circle-11"], ""],
        "icon-size": 0.7,
      },
      paint: {
        "text-color": "#e6ffe6",
        "text-halo-color": "#10281a",
        "text-halo-width": 1.5,
      },
    });
  }, [waypoints, mapLoaded]);

  // Visualizer marker effect
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || visualizerIdx == null) return;
    const coords = trailGeoJson.features[0]?.geometry?.coordinates || [];
    // Helper to show a label at a point
    const showLabel = (lngLat: [number, number], text: string) => {
      const el = document.createElement("div");
      el.style.background = "rgba(0,0,0,0.7)";
      el.style.color = "#fff";
      el.style.padding = "6px 12px";
      el.style.borderRadius = "8px";
      el.style.fontSize = "1.2em";
      el.style.fontWeight = "bold";
      el.innerText = text;
      return new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
    };
    let marker: maplibregl.Marker | null = null;
    let labelMarker: maplibregl.Marker | null = null;
    let animId: number;
    // Handle intro
    if (visualizerIdx === "start") {
      if ((map as any)._visualizerMarker) (map as any)._visualizerMarker.remove();
      if ((map as any)._mileLabel) (map as any)._mileLabel.remove();
      // Tent emoji marker
      marker = new maplibregl.Marker({
        element: (() => {
          const el = document.createElement('div');
          el.style.fontSize = '32px';
          el.style.lineHeight = '1';
          el.textContent = '⛺️';
          return el;
        })(),
      })
        .setLngLat(coords[startMile] as [number, number])
        .addTo(map);
      (map as any)._visualizerMarker = marker;
      // Show label if you want, or remove the next two lines to hide
      // labelMarker = showLabel(coords[startMile] as [number, number], `Start: Mile ${startMile}`);
      // (map as any)._mileLabel = labelMarker;
      let t = 0;
      const initialBearing = map.getBearing();
      const targetBearing = initialBearing + 90;
      const spin = () => {
        t += 0.005; // slower (4s duration)
        const smoothT = Math.min(t / 4, 1); // 4s duration
        const bearing = initialBearing + (targetBearing - initialBearing) * smoothT;
        map.easeTo({
          center: coords[startMile] as [number, number],
          zoom: 12,
          pitch: 55,
          bearing,
          duration: 50,
          offset: mapOffset,
          essential: true,
        });
        if (smoothT < 1) {
          animId = requestAnimationFrame(spin);
        }
      };
      spin();
      return () => {
        marker?.remove();
        labelMarker?.remove();
        if (animId) cancelAnimationFrame(animId);
      };
    }
    // Handle outro
    if (visualizerIdx === "end") {
      if ((map as any)._visualizerMarker) (map as any)._visualizerMarker.remove();
      if ((map as any)._mileLabel) (map as any)._mileLabel.remove();
      // Tent emoji marker
      marker = new maplibregl.Marker({
        element: (() => {
          const el = document.createElement('div');
          el.style.fontSize = '32px';
          el.style.lineHeight = '1';
          el.textContent = '⛺️';
          return el;
        })(),
      })
        .setLngLat(coords[endMile] as [number, number])
        .addTo(map);
      (map as any)._visualizerMarker = marker;
      // labelMarker = showLabel(coords[endMile] as [number, number], `End: Mile ${endMile}`);
      // (map as any)._mileLabel = labelMarker;
      const durationMs = 4000; // 4 seconds
      const initialBearing = map.getBearing();
      let startTime: number | null = null;
      const spin = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const t = Math.min(elapsed / durationMs, 1);
        const bearing = initialBearing + 360 * t; // full circle over duration
        map.easeTo({
          center: coords[endMile] as [number, number],
          zoom: 12,
          pitch: 55,
          bearing,
          duration: 50,
          offset: mapOffset,
          essential: true,
        });
        if (t < 1) {
          animId = requestAnimationFrame(spin);
        }
      };
      animId = requestAnimationFrame(spin);
      return () => {
        marker?.remove();
        labelMarker?.remove();
        if (animId) cancelAnimationFrame(animId);
      };
    }
    // Animate marker linearly between points
    // Haversine distance in meters
    function haversine([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }
    // Animate marker with distance-normalized timing
    const smoothstep = (t: number) => t * t * (3 - 2 * t); // ease-in-out
    const animate = (fromIdx: number, toIdx: number, baseDuration: number) => {
      const start = coords[fromIdx];
      const end = coords[toIdx];
      const dist = haversine(start, end);
      // Set a speed (meters per second)
      const speed = 40; // adjust for desired visual speed
      const duration = Math.max(200, dist / speed); // ms, min duration for very short segments
      const startTime = performance.now();
      const step = (now: number) => {
        let t = Math.min((now - startTime) / duration, 1);
        t = smoothstep(t); // Apply smoothing
        const pos = interpolateCoords(start as [number, number], end as [number, number], t);
        // Alternate hiker frame every 200ms
        const frame = Math.floor((now / 200) % 2);
        const hikerIcon = hikerSVGs[frame];
        if (!marker) {
          // Cheese emoji marker during animation
          marker = new maplibregl.Marker({
            element: (() => {
              const el = document.createElement('div');
              el.style.fontSize = '32px';
              el.style.lineHeight = '1';
              el.textContent = '🧀';
              return el;
            })(),
          })
            .setLngLat(pos as [number, number])
            .addTo(map);
          (map as any)._visualizerMarker = marker;
        } else {
          marker.setLngLat(pos as [number, number]);
        }
        // Show cheese or tent emoji at marker position
        if (labelMarker) labelMarker.remove();
        if (typeof visualizerIdx === 'string') {
          // Show tent emoji before/after animation
          labelMarker = new maplibregl.Marker({
            element: (() => {
              const el = document.createElement('div');
              el.style.fontSize = '32px';
              el.style.lineHeight = '1';
              el.textContent = '⛺️';
              return el;
            })(),
          })
            .setLngLat(pos as [number, number])
            .addTo(map);
        } else {
          // Show cheese emoji during animation
          labelMarker = new maplibregl.Marker({
            element: (() => {
              const el = document.createElement('div');
              el.style.fontSize = '32px';
              el.style.lineHeight = '1';
              el.textContent = '🧀';
              return el;
            })(),
          })
            .setLngLat(pos as [number, number])
            .addTo(map);
        }
        (map as any)._mileLabel = labelMarker;
        // Cinematic camera: smooth center and bearing
        const camT = Math.max(0, t - 0.2);
        const camPos = interpolateCoords(start as [number, number], end as [number, number], camT);
        const bearing = averageBearing(coords, fromIdx, 9);
        map.easeTo({
          center: camPos as [number, number],
          zoom: 12,
          pitch: 40,
          bearing,
          duration: 100,
          offset: mapOffset,
          essential: true,
        });
        if (t < 1) {
          animId = requestAnimationFrame(step);
        }
      };
      animId = requestAnimationFrame(step);
    };
    const totalSteps = endMile - startMile;
    const interval = totalSteps > 0 ? (14000 * 2) / (totalSteps + 1) : 14000 * 2;
    if (visualizerIdx < coords.length - 1 && visualizerIdx > startMile) {
      animate(visualizerIdx, visualizerIdx + 1, interval); // interval is now ignored, duration is distance-based
    }
    return () => {
      marker?.remove();
      labelMarker?.remove();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [visualizerIdx, startMile, endMile, trailGeoJson]);

  React.useEffect(() => {
    if (!overlayHiker) return;
    let animId: number;
    let running = true;
    if (visualizerIdx != null && typeof visualizerIdx === 'number') {
      setHikerLabel(`Mile ${visualizerIdx}`);
      const animate = (now: number) => {
        setHikerFrame(Math.floor((now / 200) % 2));
        if (running) animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);
    } else {
      setHikerLabel(null);
    }
    return () => { running = false; if (animId) cancelAnimationFrame(animId); };
  }, [visualizerIdx, overlayHiker]);

  // Helper for map offset to shift center down and left (to orient icon lower and left)
  const mapOffset: [number, number] =
    typeof window !== 'undefined'
      ? [window.innerWidth / 6, window.innerHeight / 3]
      : [150, 200]; // shift center left by 1/6 width, down by 1/3 height

  // Overlay hiker, tent/cheese, and mile marker label at marker position
  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {localOverlayHiker && (localVisualizerIdx !== null && localVisualizerIdx !== undefined) && (
        <div style={{ position: 'fixed', right: 48, top: '50%', transform: 'translateY(-50%)', zIndex: 3, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={hikerSVGs[hikerFrame]} width={32} height={32} alt="hiker" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 32, marginTop: 0 }}>
            {localVisualizerIdx === 'start' || localVisualizerIdx === 'end' ? '⛺️' : '🧀'}
          </div>
          <div style={{ fontSize: 18, color: '#e6ffe6', background: '#14532d', borderRadius: 8, padding: '2px 12px', marginTop: 4, fontWeight: 'bold', boxShadow: '0 2px 8px #0008' }}>
            Mile {typeof localVisualizerIdx === 'number' ? localVisualizerIdx : 0}
          </div>
        </div>
      )}
      <HotkeyOverlay
        showHotkeys={showHotkeys}
        setShowHotkeys={setShowHotkeys}
        visualizerPlaying={visualizerPlaying}
        cycleBasemap={cycleBasemap}
        setLocalShowTrail={setLocalShowTrail}
        setLocalShowMileMarkers={setLocalShowMileMarkers}
        setLocalShowPCTPOI={setLocalShowPCTPOI}
        setLocalOverlayHiker={setLocalOverlayHiker}
        setVisualizerPlaying={setVisualizerPlaying}
        setLocalVisualizerIdx={setLocalVisualizerIdx}
        startMile={startMile}
      />
    </>
  );
};

export default Map3D;
