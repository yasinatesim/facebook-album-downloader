import GithubCorner from 'react-github-corner';

import type { AppProps } from 'next/app';

import '@/assets/styles/global.scss';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />

      <GithubCorner href="https://github.com/yasinatesim/facebook-album-downloader" />
    </>
  );
}

export default MyApp;
