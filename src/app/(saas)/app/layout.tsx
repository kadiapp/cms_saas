"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/api/supabase';
import TopNav from '@/components/TopNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Paths that allow unauthenticated access (PLG Strategy)
      const isPublicPath = pathname.startsWith('/app/editor') || pathname.startsWith('/app/coding-assistant');

      if (!session && !isPublicPath) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const isPublicPath = pathname.startsWith('/app/editor') || pathname.startsWith('/app/coding-assistant');
      if ((event === 'SIGNED_OUT' || !session) && !isPublicPath) {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) {
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
      {children}
    </>
  );
}
