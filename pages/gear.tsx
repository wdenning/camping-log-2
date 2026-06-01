import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type GearItem = {
  name: string;
  brand?: string;
  weight: string;
  qty?: number;
  note?: string;
};

type GearCategory = {
  id: string;
  emoji: string;
  label: string;
  weightLb: number;
  color: string;
  items: GearItem[];
};

const TOTAL_LB = 12.04;

const CATEGORIES: GearCategory[] = [
  {
    id: 'sleep', emoji: '⛺', label: 'Sleep System', weightLb: 4.38, color: '#7adf8c',
    items: [
      { name: 'PROPHET 38L (Pack)', weight: '17.5 oz', qty: 1 },
      { name: 'Plex Solo Tent', brand: 'Zpacks', weight: '12.6 oz', qty: 1, note: 'Sounds like a trash bag in wind. Still love it.' },
      { name: 'NeoAir Xlite', brand: 'Thermarest', weight: '12.2 oz', qty: 1 },
      { name: 'Pump Sack', weight: '2 oz', qty: 1 },
      { name: 'Magma 30 Down Trail Quilt', brand: 'REI', weight: '24.4 oz', qty: 1 },
      { name: 'Pillowcase', brand: 'Zpacks', weight: '1.4 oz', qty: 1 },
    ],
  },
  {
    id: 'tools', emoji: '🍴', label: 'Tools', weightLb: 2.2, color: '#fbbf24',
    items: [
      { name: 'Zippered Cube Diddy Bag', brand: 'Ultralight Packs', weight: '0.81 oz', qty: 1 },
      { name: 'Light Titanium 450ml Cup', brand: 'TOAKS', weight: '1.75 oz', qty: 1 },
      { name: '3000T Stove', brand: 'BRS', weight: '0.92 oz', qty: 1 },
      { name: 'Bic Lighter', weight: '0.4 oz', qty: 1, note: 'Normal size, because safety first' },
      { name: 'Fuel Canister (3.53 oz)', weight: '3.53 oz', qty: 1 },
      { name: 'Titanium Spork', brand: 'Flipfuel', weight: '0.51 oz', qty: 1 },
      { name: 'Wallet (Ziplock)', weight: '1 oz', qty: 1, note: 'Cash, credit card, PCT permit' },
      { name: 'Groundhog Mini Stakes', brand: 'MSR', weight: '0.3 oz', qty: 6 },
      { name: 'Deuce of Spades Trowel', brand: 'The Tent Lab', weight: '0.6 oz', qty: 1 },
      { name: 'Ultralite Sacks', weight: '1.23 oz', qty: 1, note: 'Food storage' },
      { name: 'Trekking Poles', brand: 'Zpacks', weight: '5.5 oz', qty: 2 },
      { name: 'Sit Pad', brand: 'Zpacks', weight: '0.95 oz', qty: 1 },
      { name: 'Mini Scissors', brand: 'Tacony', weight: '0.11 oz', qty: 1 },
      { name: 'First Aid Kit', weight: '100 g', qty: 1, note: 'Antiseptic, bandaids, leukotape, blister patches, imodium, ibuprofen, electrolytes, multivitamin' },
      { name: 'Toothbrush', weight: '8 g', qty: 1 },
      { name: 'Toothpaste', weight: '3.4 oz', qty: 1 },
      { name: 'Sunscreen', weight: '3.4 oz', qty: 1 },
    ],
  },
  {
    id: 'clothing', emoji: '👕', label: 'Clothing', weightLb: 3.59, color: '#60a5fa',
    items: [
      { name: 'Echo Sun Hoodie', brand: 'Outdoor Research', weight: '9 oz', qty: 1 },
      { name: 'Transition Glasses', weight: '—', qty: 1 },
      { name: 'Toe Socks (A)', weight: '0.06 kg', qty: 1 },
      { name: 'Underwear (A)', weight: '40 g', qty: 1 },
      { name: 'Multi Trails Shorts 8"', brand: 'Patagonia', weight: '2.9 oz', qty: 1 },
      { name: 'Pants', weight: '10.4 oz', qty: 1 },
      { name: 'Speed Goat 6', brand: 'Hoka', weight: '9.8 oz', qty: 1 },
      { name: "Atom SL Hoody", brand: "Arc'teryx", weight: '9.9 oz', qty: 1 },
      { name: 'Rain Shell', brand: 'Frogg Toggs', weight: '5.6 oz', qty: 1 },
      { name: 'Socks (B)', weight: '0.06 kg', qty: 1 },
      { name: 'Long Underwear (B)', weight: '60 g', qty: 1 },
      { name: 'Fingerless Sun Gloves', brand: 'Palmfree', weight: '0.4 oz', qty: 1 },
      { name: 'Element Hat', brand: 'Tillak', weight: '47 g', qty: 1 },
    ],
  },
  {
    id: 'electronics', emoji: '🔌', label: 'Electronics', weightLb: 1.67, color: '#f472b6',
    items: [
      { name: 'InReach Mini', brand: 'Garmin', weight: '4 oz', qty: 1 },
      { name: 'NB10000 Battery Pack', brand: 'Nitecore', weight: '150 g', qty: 2, note: 'Two banks — for audiobooks, videos, and editing at camp' },
      { name: 'Charging Cable', weight: '40 g', qty: 1 },
      { name: 'NU25 MCT UL 400 Headlamp', brand: 'Nitecore', weight: '46 g', qty: 1 },
      { name: 'iPhone 16 Pro', brand: 'Apple', weight: '199 g', qty: 1 },
      { name: 'Anker Nano USBC Charger', brand: 'Anker', weight: '38 g', qty: 1, note: 'Single USB-C — trying to go minimal' },
      { name: 'Wired Headphones', brand: 'Apple', weight: '0.02 kg', qty: 1 },
    ],
  },
  {
    id: 'water', emoji: '🚰', label: 'Food & Water', weightLb: 0.2, color: '#fb923c',
    items: [
      { name: 'Smart Water 750ml Bottle', weight: '1 oz', qty: 2 },
      { name: 'Sawyer Squeeze Filter', brand: 'Sawyer', weight: '35 g', qty: 1 },
    ],
  },
];

// Donut chart geometry
const CX = 140, CY = 140, R_OUT = 120, R_IN = 64;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function slicePath(start: number, end: number): string {
  const [ox1, oy1] = polar(R_OUT, start);
  const [ox2, oy2] = polar(R_OUT, end);
  const [ix2, iy2] = polar(R_IN, end);
  const [ix1, iy1] = polar(R_IN, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

// Pre-compute start/end angles for each category (0 = top, clockwise)
const SLICES = (() => {
  let cur = 0;
  return CATEGORIES.map((cat) => {
    const span = (cat.weightLb / TOTAL_LB) * 360;
    const start = cur;
    cur += span;
    return { start, end: cur };
  });
})();

export default function GearPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pieGRef = useRef<SVGGElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIdxRef = useRef(0);
  const activeCat = CATEGORIES[activeIdx];
  const displayIdx = hoveredIdx ?? activeIdx;
  const displayCat = CATEGORIES[displayIdx];

  const scrollToSection = (idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keep activeIdxRef in sync for scroll handler (avoids stale closure)
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // Detect which section is scrolled into view (scoped to the panel)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        const idx = parseInt(top.target.getAttribute('data-section') ?? '0', 10);
        setActiveIdx(idx);
      },
      { root: panel, rootMargin: '-10% 0px -60% 0px', threshold: 0.05 }
    );
    panel.querySelectorAll('[data-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile]);

  // Reset any lingering arc transforms when switching to mobile
  useEffect(() => {
    if (!isMobile || !panelRef.current) return;
    panelRef.current.querySelectorAll<HTMLElement>('[data-gear-row]').forEach((el) => {
      el.style.transform = '';
    });
  }, [isMobile]);

  // Arc effect — items bow right as they pass the panel center (desktop only)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || isMobile) return;
    const ARC_R = 300;
    const MAX_X = 56;
    const update = () => {
      const rect = panel.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      panel.querySelectorAll<HTMLElement>('[data-gear-row]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const dy = r.top + r.height / 2 - cy;
        const t = Math.abs(dy) / ARC_R;
        el.style.transform = t < 1
          ? `translateX(${(MAX_X * Math.sqrt(1 - t * t)).toFixed(1)}px)`
          : 'translateX(0)';
      });
    };
    panel.addEventListener('scroll', update, { passive: true });
    update();
    return () => panel.removeEventListener('scroll', update);
  }, [isMobile]);

  // Pie scroll-rotation — continuously rotates as user scrolls through each section
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const update = () => {
      if (!pieGRef.current) return;
      const scrollTop = panel.scrollTop;
      const idx = activeIdxRef.current;
      const tops = sectionRefs.current.map((el) => el?.offsetTop ?? 0);
      const sectionTop = tops[idx] ?? 0;
      const nextTop = tops[idx + 1] ?? panel.scrollHeight;
      const progress = Math.max(0, Math.min(1, (scrollTop - sectionTop) / Math.max(nextTop - sectionTop, 1)));
      const sliceSpan = SLICES[idx].end - SLICES[idx].start;
      const rotation = -SLICES[idx].start - progress * sliceSpan;
      pieGRef.current.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
    };
    panel.addEventListener('scroll', update, { passive: true });
    update();
    return () => panel.removeEventListener('scroll', update);
  }, [isMobile]);

  const svgSize = isMobile ? 160 : 280;

  return (
    <>
      <style>{`
        body { margin: 0; background: #10281a; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden', background: '#10281a', color: '#e6ffe6', fontFamily: 'sans-serif' }}>

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
            paddingBottom: '2rem',
          }}
        >
          <div>
            <span style={{ color: '#b6f5c1', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 18 }}>
              PCT Hike Log
            </span>
            <span style={{ color: '#4a7a5a', fontFamily: 'sans-serif', fontSize: 14, marginLeft: 12 }}>
              Gear List
            </span>
          </div>
          <Link
            href="/"
            style={{ color: '#7adf8c', fontFamily: 'sans-serif', fontSize: 14, textDecoration: 'none', fontWeight: 'bold', pointerEvents: 'all' }}
          >
            ← Home
          </Link>
        </div>

        {/* ── CHART PANEL (left on desktop, top on mobile) ── */}
        <div style={{
          width: isMobile ? '100%' : 280,
          height: isMobile ? 'auto' : '100vh',
          flexShrink: 0,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'center',
          gap: isMobile ? 16 : 20,
          background: '#10281a',
          padding: isMobile ? '72px 16px 12px' : '28px 8px',
          overflowY: 'hidden',
        }}>

          {!isMobile && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7adf8c', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>PCT 2026</div>
              <div style={{ color: '#b6f5c1', fontSize: 20, fontWeight: 'bold' }}>Gear List</div>
            </div>
          )}

          {/* Donut chart */}
          <svg width={svgSize} height={svgSize} viewBox="0 0 280 280" style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}>
            <g ref={pieGRef} style={{ transformOrigin: `${CX}px ${CY}px` }}>
              {CATEGORIES.map((cat, i) => (
                <path
                  key={cat.id}
                  d={slicePath(SLICES[i].start, SLICES[i].end)}
                  fill={cat.color}
                  opacity={i === activeIdx ? 1 : hoveredIdx === i ? 0.7 : 0.28}
                  stroke="#10281a"
                  strokeWidth={4}
                  style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => scrollToSection(i)}
                />
              ))}
            </g>

            {/* Center label */}
            <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle" fill="#e6ffe6" fontSize={17} fontWeight="bold" style={{ transition: 'all 0.2s', pointerEvents: 'none' }}>
              {displayCat.weightLb} lb
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="middle" fill={displayCat.color} fontSize={10} letterSpacing="0.08em" style={{ transition: 'all 0.2s', pointerEvents: 'none' }}>
              {displayCat.label.toUpperCase()}
            </text>
          </svg>

          {/* Category list on mobile (tap to scroll) */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToSection(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, opacity: i === activeIdx ? 1 : 0.35, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: i === activeIdx ? cat.color : '#7adf8c66', fontSize: 12, fontWeight: i === activeIdx ? 'bold' : 'normal', transition: 'color 0.2s' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
              <div style={{ color: '#b6f5c1', fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                Total {TOTAL_LB} lb
              </div>
            </div>
          )}
        </div>

        {/* ── SCROLLABLE LIST PANEL ── */}
        <div
          ref={panelRef}
          style={{
            flex: 1,
            height: isMobile ? undefined : '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '16px 20px 80px' : '64px 52px 140px 16px',
            maskImage: isMobile ? undefined : 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            WebkitMaskImage: isMobile ? undefined : 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          }}>

          {/* Gear sections */}
          {CATEGORIES.map((cat, catIdx) => (
            <div key={cat.id} style={{ marginBottom: 80 }}>

              {/* Section header — IntersectionObserver target */}
              <div
                ref={(el) => { sectionRefs.current[catIdx] = el; }}
                data-section={catIdx}
                data-gear-row="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 20,
                  paddingBottom: 14,
                  borderBottom: `2px solid ${cat.color}33`,
                  maxWidth: isMobile ? '100%' : 340,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e6ffe6', fontSize: 21, fontWeight: 'bold' }}>{cat.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: cat.color, fontSize: 20, fontWeight: 'bold' }}>{cat.weightLb} lb</div>
                  <div style={{ color: '#7adf8c66', fontSize: 12 }}>{cat.items.length} items</div>
                </div>
              </div>

              {/* Gear rows */}
              {cat.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  data-gear-row="true"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '18px 18px',
                    marginBottom: 6,
                    borderRadius: 9,
                    borderLeft: `3px solid ${cat.color}44`,
                    background: '#0f2016',
                    cursor: 'default',
                    willChange: isMobile ? 'auto' : 'transform',
                    maxWidth: isMobile ? '100%' : 340,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderLeftColor = cat.color;
                    (e.currentTarget as HTMLElement).style.background = '#183c26';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderLeftColor = `${cat.color}44`;
                    (e.currentTarget as HTMLElement).style.background = '#0f2016';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e6ffe6', fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    {item.brand && (
                      <div style={{ color: cat.color, fontSize: 12, marginTop: 2, opacity: 0.8 }}>{item.brand}</div>
                    )}
                    {item.note && (
                      <div style={{ color: '#7adf8c66', fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{item.note}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: cat.color, fontSize: 13, fontWeight: 'bold' }}>{item.weight}</div>
                    {item.qty && item.qty > 1 && (
                      <div style={{ color: '#7adf8c55', fontSize: 11, marginTop: 2 }}>×{item.qty}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
