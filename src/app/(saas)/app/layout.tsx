"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/api/supabase';
import TopNav from '@/components/TopNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Paths that allow unauthenticated access (PLG Strategy) — render immediately at t=0ms with zero spinner delay or CLS
  const isPublicPath = pathname.startsWith('/app/editor') || pathname.startsWith('/app/coding-assistant');
  const [loading, setLoading] = useState(!isPublicPath);

  useEffect(() => {
    if (isPublicPath) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, pathname, isPublicPath]);

  if (loading && !isPublicPath) {
    return (
      <>
        <TopNav />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <div className="ai-spinner" style={{ width: 40, height: 40, borderTopColor: '#3b82f6' }}></div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <React.Suspense fallback={<div style={{ minHeight: 'calc(100vh - 64px)' }} />}>
        {children}
      </React.Suspense>
    </>
  );
}
