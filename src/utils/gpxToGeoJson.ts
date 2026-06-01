import * as toGeoJSON from "@tmcw/togeojson";

export async function fetchGpxAsGeoJson(gpxUrl: string) {
  const res = await fetch(gpxUrl);
  const gpxText = await res.text();
  const dom = new window.DOMParser().parseFromString(gpxText, "text/xml");
  const geojson = toGeoJSON.gpx(dom);
  return geojson;
}
