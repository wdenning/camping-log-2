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
      `}</style>
      <div style={{ minHeight: '100vh', color: '#e6ffe6', fontFamily: 'sans-serif', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ maxWidth: 1020, margin: '0 auto', padding: '52px 28px 40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 8,
            }}
          >
            <div>
              <h1 style={{ color: '#b6f5c1', margin: 0, fontSize: 42, letterSpacing: '-1px', lineHeight: 1 }}>
                PCT Hike Log
              </h1>
              <p style={{ color: '#7adf8c', margin: '10px 0 0', fontSize: 17 }}>
                Pacific Crest Trail
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/gear"
                style={{
                  background: 'transparent',
                  color: '#7adf8c',
                  border: '1.5px solid #7adf8c44',
                  borderRadius: 8,
                  padding: '12px 22px',
                  fontSize: 15,
                  fontWeight: 'bold',
                  textDecoration: 'none',
                }}
              >
                Gear
              </Link>
              <Link
                href="/map"
                style={{
                  background: '#14532d',
                  color: '#e6ffe6',
                  border: '1.5px solid #7adf8c',
                  borderRadius: 8,
                  padding: '12px 22px',
                  fontSize: 15,
                  fontWeight: 'bold',
                  textDecoration: 'none',
                }}
              >
                See the Map →
              </Link>
            </div>
          </div>
        </div>

        {/* Completed section */}
        {completed.length > 0 && (
          <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 28px 48px' }}>
            <h3 style={{ color: '#7adf8c', margin: '0 0 20px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
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

        {/* Planned section */}
        {planned.length > 0 && (
          <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 28px 64px' }}>
            <h3 style={{ color: '#fbbf24', margin: '0 0 20px', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
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
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return { props: { posts: POSTS } };
};
