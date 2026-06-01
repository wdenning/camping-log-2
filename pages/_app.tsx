import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PCT Hike Log</title>
        <meta name="description" content="Summer 2026 flip-flop thru-hike of the Pacific Crest Trail, starting at Echo Lake near South Lake Tahoe." />
        <meta name="author" content="William Denning" />
        <meta property="og:title" content="PCT Hike Log" />
        <meta property="og:description" content="Summer 2026 flip-flop thru-hike of the Pacific Crest Trail." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="PCT Hike Log" />
        <meta name="twitter:description" content="Summer 2026 flip-flop thru-hike of the Pacific Crest Trail." />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥾</text></svg>"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
