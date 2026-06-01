import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, ReactElement } from 'react';
import lineSliceAlong from '@turf/line-slice-along';
import { lineString } from '@turf/helpers';
import { POSTS, Post } from '../../src/data/posts';
import { trailDistanceToCoord } from '../../src/utils/trailUtils';
import {
  MdTerrain,
  MdSatellite,
  MdOutlineMap,
  MdFullscreen,
  MdFullscreenExit,
  MdSettings,
  MdPlayArrow,
  MdPause,
  MdLayers,
  MdExpandLess,
  MdExpandMore,
} from 'react-icons/md';
import { FiMap, FiSun, FiArrowUpRight } from 'react-icons/fi';

const Map3D = dynamic(() => import('../../src/components/Map3D'), { ssr: false });

type BasemapType = 'outdoor' | 'satellite' | 'streets' | 'topo' | 'dotshading' | 'slopeshading' | 'aspectshading';
type VisualizerIdx = number | 'start' | 'end';

const basemapOptions: { value: BasemapType; label: string; icon: ReactElement; info: string }[] = [
  { value: 'satellite', label: 'Satellite', icon: <MdSatellite size={22} />, info: 'USGS imagery.' },
  { value: 'outdoor', label: 'Outdoor', icon: <MdOutlineMap size={22} />, info: 'USGS topo with trails.' },
  { value: 'streets', label: 'Streets', icon: <FiMap size={22} />, info: 'OpenStreetMap.' },
  { value: 'topo', label: 'Topo', icon: <MdTerrain size={22} />, info: 'OpenTopoMap contours.' },
  { value: 'dotshading', label: 'Dot Shade', icon: <FiSun size={22} />, info: 'Hillshade with green shadow dots.' },
  { value: 'slopeshading', label: 'Slope', icon: <span style={{ fontWeight: 'bold', fontSize: 22 }}>/</span>, info: 'Steep slope shading.' },
  { value: 'aspectshading', label: 'Aspect', icon: <FiArrowUpRight size={22} />, info: 'N/S facing slope shading.' },
];

export default function PostPage({ post }: { post: Post }) {
  const [geojson, setGeojson] = useState<any>(null);
  const [startIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<VisualizerIdx>('start');
  const [basemap, setBasemap] = useState<BasemapType>('satellite');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [trailColor, setTrailColor] = useState(post?.status === 'planned' ? '#fbbf24' : '#fff');
  const [showMileMarkers, setShowMileMarkers] = useState(true);
  const [showSkybox, setShowSkybox] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [cameraAttached, setCameraAttached] = useState(true);
  const [waypoints, setWaypoints] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch Halfmile waypoints for sections K and L, filter to this post's bbox
  useEffect(() => {
    if (!post) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    Promise.all([
      fetch(`${base}/halfmile-ca-sec-k-waypoints.geojson`).then(r => r.json()),
      fetch(`${base}/halfmile-ca-sec-l-waypoints.geojson`).then(r => r.json()),
    ]).then(([k, l]) => {
      const all = [...k.features, ...l.features];
      const startC = post.startCoord ?? [-125, 32];
      const endC = post.endCoord ?? [-114, 49];
      const minLng = Math.min(startC[0], endC[0]) - 0.05;
      const maxLng = Math.max(startC[0], endC[0]) + 0.05;
      const minLat = Math.min(startC[1], endC[1]) - 0.05;
      const maxLat = Math.max(startC[1], endC[1]) + 0.05;
      const filtered = all.filter((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
      });
      setWaypoints({ type: 'FeatureCollection', features: filtered });
    }).catch(() => {});
  }, [post?.startCoord, post?.endCoord]);

  useEffect(() => {
    if (!post) return;
    if (post.gpxFile) {
      import('../../src/utils/gpxToGeoJson')
        .then(({ fetchGpxAsGeoJson }) => fetchGpxAsGeoJson(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${post.gpxFile!}`))
        .then((gj) => {
          setGeojson(gj);
          const coords = (gj.features[0]?.geometry as any)?.coordinates || [];
          setEndIdx(coords.length - 1);
        });
    } else {
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/Full_PCT_Simplified.geojson`)
        .then((r) => r.json())
        .then((full) => {
          const coords: [number, number][] = full.features[0].geometry.coordinates;
          const fullLine = lineString(coords);
          const PCT_TOTAL = 2650;
          let totalGeo = 0;
          for (let j = 1; j < coords.length; j++) {
            const dx = (coords[j][0] - coords[j-1][0]) * Math.cos(coords[j][1] * Math.PI / 180) * 69.11;
            const dy = (coords[j][1] - coords[j-1][1]) * 69.11;
            totalGeo += Math.sqrt(dx*dx + dy*dy);
          }
          const startGeoMile = post.startCoord
            ? trailDistanceToCoord(coords, post.startCoord)
            : post.pctMileStart * (totalGeo / PCT_TOTAL);
          const endGeoMile = post.endCoord
            ? trailDistanceToCoord(coords, post.endCoord)
            : post.pctMileEnd * (totalGeo / PCT_TOTAL);
          const sliced = lineSliceAlong(fullLine, startGeoMile, endGeoMile, { units: 'miles' });
          const gj = { type: 'FeatureCollection', features: [sliced] };
          setGeojson(gj);
          setEndIdx(sliced.geometry.coordinates.length - 1);
        });
    }
  }, [post?.gpxFile, post?.pctMileStart, post?.pctMileEnd, post?.startCoord, post?.endCoord]);

  useEffect(() => {
    if (!playing) return;
    const startDuration = 1500 / animationSpeed;
    const endDuration = 2500 / animationSpeed;
    const trailDuration = 28000 / animationSpeed - startDuration - endDuration;
    const steps = endIdx - startIdx;

    if (currentIdx === 'start') {
      const id = setTimeout(() => setCurrentIdx(startIdx), startDuration);
      return () => clearTimeout(id);
    }
    if (typeof currentIdx === 'number' && currentIdx < endIdx) {
      const interval = steps > 0 ? trailDuration / (steps + 1) : trailDuration;
      const id = setTimeout(() => setCurrentIdx(currentIdx + 1), interval);
      return () => clearTimeout(id);
    }
    if (typeof currentIdx === 'number' && currentIdx === endIdx) {
      const id = setTimeout(() => setCurrentIdx('end'), endDuration);
      return () => clearTimeout(id);
    }
    if (currentIdx === 'end') {
      setPlaying(false);
    }
  }, [playing, currentIdx, endIdx, startIdx, animationSpeed]);

  const handlePlay = () => {
    setCurrentIdx('start');
    setPlaying(true);
  };

  const handlePlayClick = () => {
    if (!playing) {
      handlePlay();
    } else {
      setPlaying(false);
    }
  };

  if (!post) return <div>Post not found</div>;

  const currentPctMile = typeof currentIdx === 'number' && endIdx > 0
    ? post.pctMileStart + (currentIdx / endIdx) * (post.pctMileEnd - post.pctMileStart)
    : null;

  const mapProps = {
    startMile: startIdx,
    endMile: endIdx,
    trailGeoJson: geojson,
    basemap,
    showTrail,
    trailColor,
    showMileMarkers,
    showPCTPOI: false,
    showSkybox,
    cameraAttached,
    waypoints,
    pctMileStart: post.pctMileStart,
  };

  // Panel content shared between desktop and mobile
  const panelContent = (
    <>
      <Link href="/" style={{ color: '#7adf8c', fontSize: 13, textDecoration: 'none', marginBottom: 20, display: 'inline-block', letterSpacing: '0.04em' }}>
        ← All sections
      </Link>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ background: post.status === 'completed' ? '#7adf8c' : '#fbbf24', color: '#10281a', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 'bold' }}>
          {post.status === 'completed' ? 'Completed' : 'Planned'}
        </span>
        <span style={{ background: post.state === 'WA' ? '#3b82f6' : post.state === 'OR' ? '#10b981' : '#f59e0b', color: '#10281a', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 'bold' }}>
          {post.state} §{post.section}
        </span>
      </div>
      <h1 style={{ color: '#b6f5c1', margin: '0 0 4px', fontSize: 26, lineHeight: 1.2 }}>{post.title}</h1>
      <div style={{ color: '#7adf8c', fontSize: 13, marginBottom: 16 }}>
        {post.date} &nbsp;·&nbsp; Miles {post.pctMileStart}–{post.pctMileEnd}
      </div>
      <p style={{ color: '#e6ffe6', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{post.description}</p>
    </>
  );

  const scrubberBottom = isMobile
    ? (panelOpen ? 'calc(50vh + 10px)' : '62px')
    : 24;

  return (
    <>
      <style>{`body { margin: 0; }`}</style>

      {/* Map fullscreen overlay */}
      {mapFullscreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: '#10281a' }}>
          <button
            onClick={() => setMapFullscreen(false)}
            style={{ position: 'absolute', top: 18, right: 24, zIndex: 101, background: '#14532d', color: '#e6ffe6', border: '1px solid #7adf8c', borderRadius: 8, padding: 8, fontSize: 22, cursor: 'pointer', boxShadow: '0 2px 8px #0008' }}
            title="Exit Fullscreen"
          >
            <MdFullscreenExit />
          </button>
          <Map3D {...mapProps} visualizerIdx={playing ? currentIdx : null} />
        </div>
      )}

      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#10281a', color: '#e6ffe6', fontFamily: 'sans-serif' }}>
        {/* Map background */}
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
          {geojson && <Map3D {...mapProps} visualizerIdx={currentIdx} />}
        </div>

        {/* Desktop: Left panel */}
        {!isMobile && (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: 380,
              minHeight: '100vh',
              height: '100vh',
              background: '#10281aee',
              boxShadow: '2px 0 16px #0008',
              padding: '28px 28px 28px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              backdropFilter: 'blur(4px)',
            }}
          >
            {panelContent}
          </div>
        )}

        {/* Mobile: Bottom sheet panel */}
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              height: panelOpen ? '50vh' : '52px',
              transition: 'height 0.3s ease',
              background: '#10281af0',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 -2px 16px #0008',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Handle bar */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              style={{
                height: 52,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                background: 'none',
                border: 'none',
                borderBottom: panelOpen ? '1px solid #7adf8c22' : 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span style={{ color: '#b6f5c1', fontWeight: 'bold', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                {post.title}
              </span>
              <span style={{ color: '#7adf8c', fontSize: 22, flexShrink: 0 }}>
                {panelOpen ? <MdExpandMore /> : <MdExpandLess />}
              </span>
            </button>
            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
              {panelContent}
            </div>
          </div>
        )}

        {/* Floating controls — top right */}
        <div style={{ position: 'fixed', top: 18, right: isMobile ? 14 : 24, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: isMobile ? 6 : 10 }}>
          {/* Play/Pause */}
          <button
            onClick={handlePlayClick}
            style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, background: playing ? '#7adf8c' : '#14532d', color: playing ? '#10281a' : '#e6ffe6', border: '1px solid #7adf8c', borderRadius: 8, fontSize: 28, cursor: 'pointer', boxShadow: '0 2px 8px #0008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <MdPause /> : <MdPlayArrow />}
          </button>

          {/* Current PCT mile readout */}
          {currentPctMile !== null && (
            <div style={{ background: '#10281af0', border: '1px solid #7adf8c44', borderRadius: 8, padding: '8px 14px', fontFamily: 'sans-serif', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 10, color: '#b6f5c1', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>PCT Mile</div>
              <div style={{ color: '#7adf8c', fontWeight: 'bold', fontSize: 16 }}>{currentPctMile.toFixed(1)}</div>
            </div>
          )}

          {/* Fullscreen — desktop only */}
          {!isMobile && !mapFullscreen && (
            <button
              onClick={() => setMapFullscreen(true)}
              style={{ width: 48, height: 48, background: '#14532d', color: '#e6ffe6', border: '1px solid #7adf8c', borderRadius: 8, fontSize: 22, cursor: 'pointer', boxShadow: '0 2px 8px #0008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Fullscreen Map"
            >
              <MdFullscreen />
            </button>
          )}

          {/* Layers */}
          <button
            onClick={() => setLayersOpen((v) => !v)}
            style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, background: '#14532d', color: '#e6ffe6', border: '1px solid #7adf8c', borderRadius: 8, fontSize: 22, cursor: 'pointer', boxShadow: '0 2px 8px #0008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Basemap"
          >
            <MdLayers />
          </button>

          {/* Settings */}
          <button
            onClick={() => setLegendOpen((v) => !v)}
            style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, background: '#14532d', color: '#e6ffe6', border: '1px solid #7adf8c', borderRadius: 8, fontSize: 22, cursor: 'pointer', boxShadow: '0 2px 8px #0008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Settings"
          >
            <MdSettings />
          </button>

          {/* Layers panel */}
          {layersOpen && (
            <div style={{ background: '#183c26', border: '1px solid #7adf8c', borderRadius: 8, padding: 16, minWidth: isMobile ? 220 : 260, maxWidth: isMobile ? 280 : 340, boxShadow: '0 2px 16px #000a' }}>
              <label style={{ fontSize: 13, color: '#b6f5c1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Basemap</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #7adf8c' }}>
                {basemapOptions.map((opt, i) => {
                  const perRow = 3;
                  const isLastInRow = (i + 1) % perRow === 0;
                  const isFirstRow = i < perRow;
                  return (
                    <div key={opt.value} style={{ position: 'relative', flex: 1, minWidth: 80 }}>
                      <button
                        type="button"
                        onClick={() => setBasemap(opt.value)}
                        style={{
                          background: basemap === opt.value ? '#7adf8c' : '#14532d',
                          color: basemap === opt.value ? '#10281a' : '#e6ffe6',
                          border: 'none',
                          borderRight: isLastInRow ? 'none' : '1px solid #7adf8c',
                          borderTop: isFirstRow ? 'none' : '1px solid #7adf8c',
                          borderRadius: 0,
                          padding: '10px 6px 8px',
                          fontWeight: 'bold',
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          width: '100%',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings panel */}
          {legendOpen && (
            <div style={{ background: '#183c26', border: '1px solid #7adf8c', borderRadius: 8, padding: 16, minWidth: isMobile ? 200 : 240, maxWidth: isMobile ? 260 : 320, boxShadow: '0 2px 16px #000a', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={showTrail} onChange={(e) => setShowTrail(e.target.checked)} />
                Show Trail
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Trail Color
                <input type="color" value={trailColor} onChange={(e) => setTrailColor(e.target.value)} style={{ marginLeft: 4, width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={showMileMarkers} onChange={(e) => setShowMileMarkers(e.target.checked)} />
                Mile Markers
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={showSkybox} onChange={(e) => setShowSkybox(e.target.checked)} />
                Skybox
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={cameraAttached} onChange={(e) => setCameraAttached(e.target.checked)} />
                Follow Camera
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Speed
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#7adf8c' }}
                />
                <span style={{ color: '#b6f5c1', fontWeight: 'bold', minWidth: 36 }}>{animationSpeed.toFixed(1)}×</span>
              </label>
            </div>
          )}
        </div>

        {/* Scrubber bar */}
        <div style={{
          position: 'fixed',
          bottom: scrubberBottom,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#10281acc',
          border: '1px solid #7adf8c44',
          borderRadius: 12,
          padding: '10px 18px',
          backdropFilter: 'blur(6px)',
          transition: 'bottom 0.3s ease',
          maxWidth: 'calc(100vw - 32px)',
        }}>
          <button
            onClick={() => setCurrentIdx('start')}
            style={{ background: 'none', border: 'none', color: '#7adf8c', fontSize: 13, cursor: 'pointer', padding: '0 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            {post.pctMileStart}
          </button>
          <input
            type="range"
            min={startIdx}
            max={endIdx || 1}
            value={typeof currentIdx === 'number' ? currentIdx : startIdx}
            onChange={(e) => setCurrentIdx(Number(e.target.value))}
            style={{ width: isMobile ? 160 : 240, accentColor: '#7adf8c' }}
          />
          <button
            onClick={() => setCurrentIdx('end')}
            style={{ background: 'none', border: 'none', color: '#7adf8c', fontSize: 13, cursor: 'pointer', padding: '0 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            {post.pctMileEnd}
          </button>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: POSTS.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = POSTS.find((p) => p.slug === params?.slug) ?? null;
  return { props: { post } };
};
