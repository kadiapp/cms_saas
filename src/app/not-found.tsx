'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all unknown/old traffic (404s) to the new homepage
    router.replace('/');
  }, [router]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080a0f', color: '#fff' }}>
      Redirecting...
    </div>
  );
}
