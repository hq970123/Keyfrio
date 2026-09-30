import React, { Suspense, lazy } from 'react';

const LandingPage = lazy(() =>
  import('./components/Landing/LandingPage').then((module) => ({ default: module.LandingPage }))
);

export default function WebsiteApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070912]" />}>
      <LandingPage />
    </Suspense>
  );
}
