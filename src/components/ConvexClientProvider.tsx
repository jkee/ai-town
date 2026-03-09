import { ReactNode } from 'react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
// import { ConvexProviderWithClerk } from 'convex/react-clerk';
// import { ClerkProvider, useAuth } from '@clerk/clerk-react';

/**
 * Determines the Convex deployment to use.
 *
 * In production (non-localhost), route through nginx proxy at /convex.
 * In dev, use the VITE_CONVEX_URL env var directly.
 */
function convexUrl(): string {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${window.location.origin}/convex`;
  }
  const url = import.meta.env.VITE_CONVEX_URL as string;
  if (!url) {
    throw new Error('Couldn\'t find the Convex deployment URL.');
  }
  return url;
}

/**
 * Rewrites Convex storage URLs for production.
 * In dev, passes through unchanged. In production, rewrites
 * http://127.0.0.1:3210/... to https://makaroshik.com/convex/...
 */
export function fixStorageUrl(url: string): string {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return url;
  }
  return url.replace(/^http:\/\/127\.0\.0\.1:3210\//, `${window.location.origin}/convex/`);
}

const convex = new ConvexReactClient(convexUrl(), { unsavedChangesWarning: false });

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    // <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}>
    // <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <ConvexProvider client={convex}>{children}</ConvexProvider>
    // </ConvexProviderWithClerk>
    // </ClerkProvider>
  );
}
