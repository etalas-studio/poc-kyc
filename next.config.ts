import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

// Type assertion to handle compatibility between Next.js 15 and next-pwa 5.6.0
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false, // Enable PWA in all environments for offline-first approach
  fallbacks: {
    document: "/offline", // Fallback page when offline
    image: "/offline-image.svg",
    audio: "/offline-audio.mp3", 
    video: "/offline-video.mp4",
    font: "/offline-font.woff2"
  },
  runtimeCaching: [
    // Cache API routes with CacheFirst strategy for offline-first
    {
      urlPattern: /^\/api\/.*$/,
      handler: "CacheFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        networkTimeoutSeconds: 3, // Fallback to cache after 3 seconds
      },
    },
    // Cache static assets
    {
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Cache pages with StaleWhileRevalidate for better offline experience
    {
      urlPattern: /^\/(?!api).*$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // Fallback for other requests
    {
      urlPattern: /^https?.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "external-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 3,
      },
    },
  ],
});

export default pwaConfig(nextConfig as any) as NextConfig;
