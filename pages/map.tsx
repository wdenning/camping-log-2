import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { MdTerrain, MdSatellite, MdOutlineMap, MdLayers } from 'react-icons/md';
import { FiMap } from 'react-icons/fi';
import type { GlobalBasemap } from '../src/components/GlobalMap';

const GlobalMap = dynamic(() => import('../src/components/GlobalMap'), { ssr: false });

const BASEMAP_OPTIONS: { value: GlobalBasemap; label: string; icon: React.ReactNode }[] = [
  { value: 'satellite', label: 'Satellite', icon: <MdSatellite size={20} /> },
  { value: 'topo',      label: 'Topo',      icon: <MdTerrain size={20} /> },
  { value: 'outdoor',   label: 'Outdoor',   icon: <MdOutlineMap size={20} /> },
  { value: 'streets',   label: 'Streets',   icon: <FiMap size={20} /> },
];

export default function MapPage() {
  const [basemap, setBasemap] = useState<GlobalBasemap>('satellite');
  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <>
      <style>{`body { margin: 0; }`}</style>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#10281a' }}>
        <GlobalMap basemap={basemap} />

        {/* Header overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: 'linear-gradient(to bottom, rgba(16,40,26,0.92) 60%, transparent)',
            pointerEvents: 'none',
            paddingBottom: '2rem'
          }}
        >
          <div>
            <span style={{ color: '#b6f5c1', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 18 }}>
              PCT Hike Log
            </span>
            <span style={{ color: '#4a7a5a', fontFamily: 'sans-serif', fontSize: 14, marginLeft: 12 }}>
              Full Trail Overview
            </span>
          </div>
          <Link
            href="/"
            style={{ color: '#7adf8c', fontFamily: 'sans-serif', fontSize: 14, textDecoration: 'none', fontWeight: 'bold', pointerEvents: 'all' }}
          >
            ← Home
          </Link>
        </div>

        {/* Layers button + panel — top right */}
        <div style={{ position: 'absolute', top: 60, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={() => setLayersOpen((v) => !v)}
            style={{
              width: 44, height: 44,
              background: layersOpen ? '#7adf8c' : '#14532d',
              color: layersOpen ? '#10281a' : '#e6ffe6',
              border: '1px solid #7adf8c',
              borderRadius: 8,
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0008',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Basemap"
          >
            <MdLayers />
          </button>

          {layersOpen && (
            <div style={{ background: '#183c26', border: '1px solid #7adf8c', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px #000a' }}>
              {BASEMAP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setBasemap(opt.value); setLayersOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '12px 18px',
                    background: basemap === opt.value ? '#7adf8c' : 'transparent',
                    color: basemap === opt.value ? '#10281a' : '#e6ffe6',
                    border: 'none',
                    borderBottom: '1px solid #7adf8c22',
                    fontFamily: 'sans-serif',
                    fontSize: 14,
                    fontWeight: basemap === opt.value ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                  {basemap === opt.value && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
