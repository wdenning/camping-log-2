import React from "react";
import ReactDOM from "react-dom";

type HotkeyOverlayProps = {
  showHotkeys: boolean;
  setShowHotkeys: (show: boolean) => void;
  visualizerPlaying: boolean;
  cycleBasemap: () => void;
  setLocalShowTrail: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalShowMileMarkers: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalShowPCTPOI: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalOverlayHiker: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setVisualizerPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalVisualizerIdx: React.Dispatch<React.SetStateAction<number | "start" | "end" | null | undefined>>;
  startMile: number;
};

const HotkeyOverlay: React.FC<HotkeyOverlayProps> = ({
  showHotkeys,
  setShowHotkeys,
  visualizerPlaying,
  cycleBasemap,
  setLocalShowTrail,
  setLocalShowMileMarkers,
  setLocalShowPCTPOI,
  setLocalOverlayHiker,
  setVisualizerPlaying,
  setLocalVisualizerIdx,
  startMile,
}) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '?') { setShowHotkeys(!showHotkeys); e.preventDefault(); }
      if (e.key === 'b') { cycleBasemap(); e.preventDefault(); }
      if (e.key === 't') { setLocalShowTrail(v => !v); e.preventDefault(); }
      if (e.key === 'm') { setLocalShowMileMarkers(v => !v); e.preventDefault(); }
      if (e.key === 'p') { setLocalShowPCTPOI(v => !v); e.preventDefault(); }
      if (e.key === 'h') { setLocalOverlayHiker(v => !v); e.preventDefault(); }
      if (e.key === ' ') { setVisualizerPlaying(v => !v); e.preventDefault(); }
      if (e.key === 'ArrowRight' && !visualizerPlaying) { setLocalVisualizerIdx(v => (typeof v === 'number' ? v + 1 : startMile)); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && !visualizerPlaying) { setLocalVisualizerIdx(v => (typeof v === 'number' ? Math.max(startMile, v - 1) : startMile)); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleBasemap, setLocalShowTrail, setLocalShowMileMarkers, setLocalShowPCTPOI, setLocalOverlayHiker, setVisualizerPlaying, setLocalVisualizerIdx, setShowHotkeys, visualizerPlaying, startMile]);

  if (!showHotkeys || typeof window === 'undefined') return null;
  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" tabIndex={-1} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(16,40,26,0.96)', color: '#e6ffe6', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', pointerEvents: 'auto' }} onClick={() => setShowHotkeys(false)}>
      <div style={{ background: '#14532d', borderRadius: 16, padding: 32, minWidth: 340, boxShadow: '0 4px 32px #000a', fontSize: 18, margin: 24 }}>
        <div style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>Map Hotkeys</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li><b>?</b>: Show/hide this hotkey reference</li>
          <li><b>b</b>: Cycle basemap</li>
          <li><b>t</b>: Toggle trail</li>
          <li><b>m</b>: Toggle mile markers</li>
          <li><b>p</b>: Toggle POIs</li>
          <li><b>h</b>: Toggle hiker overlay</li>
          <li><b>Space</b>: Play/pause visualizer</li>
          <li><b>→</b>: Advance visualizer (when paused)</li>
          <li><b>←</b>: Rewind visualizer (when paused)</li>
          <li style={{ marginTop: 12, color: '#ffe6b6' }}>Click anywhere to close</li>
        </ul>
      </div>
    </div>,
    document.body
  );
};

export default HotkeyOverlay;
