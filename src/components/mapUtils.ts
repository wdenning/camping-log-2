// mapUtils.ts

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const interpolateCoords = (start: [number, number], end: [number, number], t: number): [number, number] => [
  lerp(start[0], end[0], t),
  lerp(start[1], end[1], t),
];

export function averageBearing(coords: [number, number][], idx: number, window: number = 5) {
  let sumSin = 0;
  let sumCos = 0;
  let count = 0;
  for (let i = Math.max(0, idx - Math.floor(window / 2)); i < Math.min(coords.length - 1, idx + Math.ceil(window / 2)); i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const angle = (Math.atan2(dx, dy) * Math.PI) / 180;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
    count++;
  }
  if (count === 0) return 0;
  return (Math.atan2(sumSin / count, sumCos / count) * 180) / Math.PI;
}

const TERRARIUM_DEM = {
  type: "raster-dem" as const,
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium" as const,
  tileSize: 256,
  maxzoom: 15,
  attribution: "Terrain © Mapzen, AWS",
};

export const getMapStyle = (basemap: string) => {
  if (basemap === "dotshading") {
    return {
      version: 8 as const,
      sources: {
        "dem-terrain": TERRARIUM_DEM,
        "dem-hillshade": TERRARIUM_DEM,
      },
      layers: [
        {
          id: "hillshade",
          type: "hillshade",
          source: "dem-hillshade",
          paint: {
            "hillshade-shadow-color": "#14532d",
            "hillshade-highlight-color": "#e6ffe6",
            "hillshade-accent-color": "#7adf8c",
            "hillshade-exaggeration": 1,
          },
        },
      ],
      terrain: {
        source: "dem-terrain",
        exaggeration: 1.5,
      },
    };
  }
  if (basemap === "slopeshading") {
    return {
      version: 8 as const,
      sources: {
        "dem-terrain": TERRARIUM_DEM,
        "dem-hillshade": TERRARIUM_DEM,
      },
      layers: [
        {
          id: "hillshade",
          type: "hillshade",
          source: "dem-hillshade",
          paint: {
            "hillshade-shadow-color": "#14532d",
            "hillshade-highlight-color": "rgba(0,0,0,0)",
            "hillshade-accent-color": "rgba(0,0,0,0)",
            "hillshade-exaggeration": 1,
          },
        },
      ],
      terrain: {
        source: "dem-terrain",
        exaggeration: 1.5,
      },
    };
  }
  if (basemap === "aspectshading") {
    return {
      version: 8 as const,
      sources: {
        "dem-terrain": TERRARIUM_DEM,
        "dem-hillshade": TERRARIUM_DEM,
      },
      layers: [
        {
          id: "hillshade",
          type: "hillshade",
          source: "dem-hillshade",
          paint: {
            "hillshade-shadow-color": "#14532d",
            "hillshade-highlight-color": "#e6d7b0",
            "hillshade-accent-color": "#7adf8c",
            "hillshade-exaggeration": 1,
          },
        },
      ],
      terrain: {
        source: "dem-terrain",
        exaggeration: 1.5,
      },
    };
  }
  // USGS z/y/x order (note: y and x are swapped vs standard slippy map)
  let tilesUrl = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}";
  let attribution = "USGS National Map";
  if (basemap === "satellite") {
    tilesUrl = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
    attribution = "USGS National Map Imagery";
  }
  if (basemap === "streets") {
    tilesUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    attribution = "© OpenStreetMap contributors";
  }
  if (basemap === "topo") {
    tilesUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
    attribution = "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors";
  }
  return {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles: [tilesUrl],
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
      terrain: TERRARIUM_DEM,
    },
    layers: [
      {
        id: "basemap",
        type: "raster" as const,
        source: "basemap",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
    terrain: {
      source: "terrain",
      exaggeration: 1.5,
    },
  };
};
