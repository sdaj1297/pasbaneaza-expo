import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Anjuman Pasban-e-Aza - Houston</title>
        <meta
          name="description"
          content="Houston majlis schedule, Anjuman committed programs, community events, prayer times, and Pasban-e-Aza updates."
        />
        <link rel="canonical" href="https://www.pasbaneaza.org/" />
        <link rel="apple-touch-icon" href="https://www.pasbaneaza.org/social-preview.png" />
        <meta name="theme-color" content="#090807" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Anjuman Pasban-e-Aza" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content="https://www.pasbaneaza.org/" />
        <meta property="og:title" content="Anjuman Pasban-e-Aza" />
        <meta
          property="og:description"
          content="Houston majlis schedule, community events, live majlis status, prayer times, and Pasban-e-Aza announcements."
        />
        <meta
          property="og:image"
          content="https://www.pasbaneaza.org/social-preview.png"
        />
        <meta property="og:image:secure_url" content="https://www.pasbaneaza.org/social-preview.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="Anjuman Pasban-e-Aza logo" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Anjuman Pasban-e-Aza" />
        <meta
          name="twitter:description"
          content="Houston majlis schedule, community events, live majlis status, prayer times, and Pasban-e-Aza announcements."
        />
        <meta
          name="twitter:image"
          content="https://www.pasbaneaza.org/social-preview.png"
        />
        <meta name="twitter:image:alt" content="Anjuman Pasban-e-Aza logo" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #090807;
  margin: 0;
  overscroll-behavior-y: none;
}

* {
  box-sizing: border-box;
}

.pasban-desktop-only {
  display: flex;
}

.pasban-mobile-only {
  display: none !important;
}

.pasban-flyer-portrait {
  display: none !important;
  width: 100%;
}

.pasban-flyer-landscape {
  display: flex !important;
  width: 100%;
}

@media (max-width: 819px), (orientation: portrait) {
  .pasban-desktop-only {
    display: none !important;
  }

  .pasban-mobile-only {
    display: flex !important;
  }
}

@media (max-width: 699px), (orientation: portrait) {
  .pasban-flyer-portrait {
    display: flex !important;
  }

  .pasban-flyer-landscape {
    display: none !important;
  }
}

::selection {
  background: #7d1b27;
  color: #f7f1e7;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #090807;
}

::-webkit-scrollbar-thumb {
  background: #3b322d;
  border: 2px solid #090807;
  border-radius: 8px;
}`;
