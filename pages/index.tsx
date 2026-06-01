import { GetStaticProps } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { POSTS, Post } from '../src/data/posts';

const HomepageMapBackground = dynamic(
  () => import('../src/components/HomepageMapBackground'),
  { ssr: false }
);

const STATE_COLOR: Record<string, string> = { CA: '#f59e0b', OR: '#10b981', WA: '#3b82f6' };
const STATUS_COLOR: Record<string, string> = { completed: '#7adf8c', planned: '#fbbf24' };

function PostCard({ post }: { post: Post }) {
  const inner = (
    <div
      style={{
        background: '#183c26',
        border: `1.5px solid ${post.status === 'completed' ? '#7adf8c44' : '#fbbf2444'}`,
        borderRadius: 12,
        padding: 24,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            background: STATE_COLOR[post.state],
            color: '#10281a',
            borderRadius: 6,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}
        >
          {post.state}
        </span>
        <span
          style={{
            background: STATUS_COLOR[post.status],
            color: '#10281a',
            borderRadius: 6,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {post.status === 'completed' ? 'Completed' : 'Planned'}
        </span>
      </div>
      <h2 style={{ color: '#e6ffe6', margin: '0 0 6px', fontSize: 20, lineHeight: 1.2 }}>{post.title}</h2>
      <div style={{ color: '#7adf8c', fontSize: 13, marginBottom: 12 }}>
        {post.date} &nbsp;·&nbsp; Miles {post.pctMileStart}–{post.pctMileEnd}
      </div>
      <p style={{ color: '#b6f5c1', fontSize: 15, margin: '0 0 auto', lineHeight: 1.55 }}>{post.description}</p>
      <div style={{ marginTop: 20, color: '#7adf8c', fontSize: 14, fontWeight: 'bold' }}>
        {post.gpxFile ? 'Open map →' : 'View route →'}
      </div>
    </div>
  );

  return (
    <Link href={`/posts/${post.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {inner}
    </Link>
  );
}

export default function Home({ posts }: { posts: Post[] }) {
  const completed = posts.filter((p) => p.status === 'completed');
  const planned = posts.filter((p) => p.status === 'planned');

  return (
    <>
      <HomepageMapBackground />
      <style>{`
        body { margin: 0; background: #060d08; }
        a:hover > div { border-color: #7adf8c !important; box-shadow: 0 4px 24px #0006; }

        .btn-glass {
          position: relative;
          display: inline-block;
          padding: 13px 26px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: bold;
          text-decoration: none;
          overflow: hidden;
          color: #e6ffe6;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          background: transparent;
          backdrop-filter: blur(48px) saturate(2.2) brightness(1.06);
          -webkit-backdrop-filter: blur(48px) saturate(2.2) brightness(1.06);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 1px 8px rgba(0,0,0,0.12);
        }
        /* Edge refraction — faint left/right brightening only */
        .btn-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            linear-gradient(to right, rgba(255,255,255,0.06) 0%, transparent 18%),
            linear-gradient(to left,  rgba(255,255,255,0.05) 0%, transparent 18%);
          pointer-events: none;
        }
        .btn-glass::after { display: none; }
        .btn-glass:hover {
          transform: translateY(-2px) scale(1.03);
          border-color: rgba(182,245,193,0.22);
          box-shadow: 0 4px 18px rgba(0,0,0,0.22);
        }
        .btn-glass:active {
          transform: translateY(0) scale(0.97);
          box-shadow: 0 1px 6px rgba(0,0,0,0.12);
        }

        .btn-glass-primary {
          background: transparent;
          border-color: rgba(122,223,140,0.12);
          box-shadow: 0 1px 8px rgba(0,0,0,0.12);
        }
        .btn-glass-primary:hover {
          border-color: rgba(122,223,140,0.28);
          box-shadow: 0 4px 18px rgba(0,0,0,0.22);
        }
      `}</style>
      <div style={{ color: '#e6ffe6', fontFamily: 'sans-serif', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 28px',
          }}
        >
          <h1
            style={{
              color: '#b6f5c1',
              margin: '0 0 14px',
              fontSize: 'clamp(38px, 6vw, 68px)',
              letterSpacing: '-2px',
              lineHeight: 1,
              textShadow: '0 2px 32px #000c',
            }}
          >
            PCT Hike Log
          </h1>
          <p
            style={{
              color: '#7adf8c',
              margin: '0 0 44px',
              fontSize: 18,
              textShadow: '0 1px 12px #000b',
            }}
          >
            Summer 2026 Flip-Fop Hike on the Pacific Crest Trail
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/gear" className="btn-glass">
              Gear
            </Link>
            <Link href="/map" className="btn-glass btn-glass-primary">
              See the Map →
            </Link>
          </div>
        </div>

        {/* Posts — sit below the hero, fading in from the map */}
        <div
          style={{
            background: 'linear-gradient(to bottom, transparent 0px, #060d08 80px)',
            paddingTop: 40,
          }}
        >
          {completed.length > 0 && (
            <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 28px 48px' }}>
              <h3
                style={{
                  color: '#7adf8c',
                  margin: '0 0 20px',
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Completed
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 20,
                }}
              >
                {completed.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}

          {planned.length > 0 && (
            <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 28px 64px' }}>
              <h3
                style={{
                  color: '#fbbf24',
                  margin: '0 0 20px',
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Planned
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 20,
                }}
              >
                {planned.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return { props: { posts: POSTS } };
};
