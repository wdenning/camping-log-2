import Link from 'next/link';

const SECTION_1 = { miles: 1560, from: 'Echo Lake, CA', to: 'Manning Park, BC', direction: 'Northbound', dates: 'Summer 2025' };
const SECTION_2 = { miles: 1090, from: 'Echo Lake, CA', to: 'Campo, CA', direction: 'Southbound', dates: 'Fall 2025' };

function SectionCard({
  num, color, direction, from, to, miles, dates, description,
}: {
  num: number; color: string; direction: string; from: string; to: string;
  miles: number; dates: string; description: string;
}) {
  return (
    <div
      style={{
        background: '#183c26',
        border: `2px solid ${color}`,
        borderRadius: 16,
        padding: '32px 36px',
        flex: 1,
        minWidth: 280,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            background: color,
            color: '#10281a',
            borderRadius: '50%',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {num}
        </div>
        <div>
          <div style={{ color, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Section {num}
          </div>
          <div style={{ color: '#e6ffe6', fontSize: 22, fontWeight: 'bold', lineHeight: 1.1 }}>{direction}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: `1px solid ${color}22`, paddingBottom: 8 }}>
          <span style={{ color: '#7adf8c' }}>From</span>
          <span style={{ color: '#e6ffe6', fontWeight: 500 }}>{from}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: `1px solid ${color}22`, paddingBottom: 8 }}>
          <span style={{ color: '#7adf8c' }}>To</span>
          <span style={{ color: '#e6ffe6', fontWeight: 500 }}>{to}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: `1px solid ${color}22`, paddingBottom: 8 }}>
          <span style={{ color: '#7adf8c' }}>Distance</span>
          <span style={{ color: color, fontWeight: 'bold' }}>~{miles.toLocaleString()} miles</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: '#7adf8c' }}>When</span>
          <span style={{ color: '#e6ffe6' }}>{dates}</span>
        </div>
      </div>

      <p style={{ color: '#b6f5c1', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{description}</p>
    </div>
  );
}

export default function RoutePage() {
  return (
    <>
      <style>{`body { margin: 0; background: #10281a; }`}</style>
      <div style={{ minHeight: '100vh', background: '#10281a', color: '#e6ffe6', fontFamily: 'sans-serif' }}>
        {/* Header */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '52px 28px 0' }}>
          <Link href="/" style={{ color: '#7adf8c', fontSize: 13, textDecoration: 'none', letterSpacing: '0.04em' }}>
            ← Back to log
          </Link>
          <h1 style={{ color: '#b6f5c1', fontSize: 42, margin: '20px 0 8px', letterSpacing: '-1px', lineHeight: 1 }}>
            My Route
          </h1>
          <p style={{ color: '#7adf8c', fontSize: 17, margin: '0 0 40px' }}>
            PCT Flip-Flop — Starting at Lake Tahoe
          </p>
        </div>

        {/* Intro */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px 48px' }}>
          <div
            style={{
              background: '#183c26',
              border: '1px solid #7adf8c33',
              borderRadius: 12,
              padding: '28px 32px',
              marginBottom: 40,
            }}
          >
            <h2 style={{ color: '#e6ffe6', margin: '0 0 16px', fontSize: 20 }}>What's a flip-flop?</h2>
            <p style={{ color: '#b6f5c1', fontSize: 16, lineHeight: 1.7, margin: '0 0 16px' }}>
              A flip-flop is a non-linear way to complete a long trail. Instead of starting at one end and walking straight
              through, I'm starting mid-trail at Echo Lake near South Lake Tahoe — and hiking each direction separately.
            </p>
            <p style={{ color: '#b6f5c1', fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              The result is still the entire PCT — all 2,650 miles — just in two legs rather than one continuous push
              from end to end.
            </p>
          </div>

          {/* Why */}
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ color: '#e6ffe6', fontSize: 22, margin: '0 0 20px' }}>Why start at Tahoe?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { title: 'Sierra snowpack', body: 'Starting in early summer means the high Sierra has had time to melt out — no post-holing through June snow on a NOBO from Mexico.' },
                { title: 'Desert timing', body: 'Hitting SoCal in fall means cooler temps, less scorching heat, and a more pleasant desert crossing.' },
                { title: 'Cascade window', body: 'Heading north first means Washington and Oregon in peak late-summer conditions before the fall window closes.' },
                { title: 'Flexibility', body: 'Starting mid-trail gives more scheduling flexibility and avoids the crowded NOBO bubble that leaves the southern terminus every spring.' },
              ].map(({ title, body }) => (
                <div key={title} style={{ background: '#142b1e', borderRadius: 10, padding: '18px 20px', border: '1px solid #7adf8c22' }}>
                  <div style={{ color: '#7adf8c', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>{title}</div>
                  <p style={{ color: '#b6f5c1', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section cards */}
          <h2 style={{ color: '#e6ffe6', fontSize: 22, margin: '0 0 20px' }}>The two legs</h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 48 }}>
            <SectionCard
              num={1}
              color="#7adf8c"
              direction="Northbound"
              from={SECTION_1.from}
              to={SECTION_1.to}
              miles={SECTION_1.miles}
              dates={SECTION_1.dates}
              description="Head north first while the Sierra is clear. Cross Oregon and Washington before autumn storms roll in. Finish at the Northern Terminus at the Canadian border, then fly back to Tahoe."
            />
            <SectionCard
              num={2}
              color="#fbbf24"
              direction="Southbound"
              from={SECTION_2.from}
              to={SECTION_2.to}
              miles={SECTION_2.miles}
              dates={SECTION_2.dates}
              description="Return to Echo Lake and hike south through the Feather River country, past Mt. Whitney and the High Sierra, through the Mojave, and into the Sonoran Desert — finishing at the Southern Terminus at Campo."
            />
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href="/map"
              style={{
                background: '#14532d',
                color: '#e6ffe6',
                border: '1.5px solid #7adf8c',
                borderRadius: 8,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              View route on map →
            </Link>
            <Link
              href="/"
              style={{
                background: 'transparent',
                color: '#7adf8c',
                border: '1.5px solid #7adf8c44',
                borderRadius: 8,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Browse hike log →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
