"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/api/supabase';
import './AdminDashboard.css';

// IMPORTANT: Replace this with your actual admin email address
const ADMIN_EMAIL = 'tayebcherifabdelkadermiloud@gmail.com'; 

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pdfExports: 0,
    ediExports: 0,
    aiExtractions: 0
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if the logged in user is the admin.
    // NOTE: You can change this to check a database role, or just change the ADMIN_EMAIL variable above.
    if (!session || session.user.email !== ADMIN_EMAIL) {
      // For development/demo purposes, if ADMIN_EMAIL is untouched, we'll just allow it or show the unauthorized message.
      // If you want it totally locked down immediately, uncomment the router.push
      // router.push('/app');
      setIsAuthorized(false);
      return;
    }
    
    setIsAuthorized(true);
    fetchData();
  };

  const fetchData = async () => {
    // 1. Fetch Waitlist
    const { data: waitlistData } = await supabase
      .from('clearinghouse_waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (waitlistData) setWaitlist(waitlistData);

    // 2. Fetch Activity Log
    const { data: activityData } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (activityData) {
      setActivities(activityData);
      
      // Calculate basic stats from the recent logs (or we could run a COUNT query)
      const pdfs = activityData.filter(a => a.action === 'export_pdf').length;
      const edis = activityData.filter(a => a.action === 'export_edi').length;
      const ais = activityData.filter(a => a.action === 'ai_extract').length;
      
      setStats({
        pdfExports: pdfs, // Note: this is just from the last 50 events for the demo
        ediExports: edis,
        aiExtractions: ais
      });
    }
  };

  if (isAuthorized === null) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Admin Panel...</div>;

  if (isAuthorized === false) {
    return (
      <div className="admin-unauthorized">
        <h2>? Unauthorized</h2>
        <p style={{ color: '#94a3b8', marginTop: '1rem', maxWidth: '400px' }}>
          You do not have permission to view the Admin Dashboard. <br/><br/>
          <i>Developer Note: To access this, change the <code>ADMIN_EMAIL</code> variable in <code>src/app/(saas)/app/admin/page.tsx</code> to match your logged-in email.</i>
        </p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Monitor your SaaS performance, waitlist signups, and user milestones.</p>
      </div>

      <div className="admin-stats-grid">
        <div className="glass-card stat-card">
          <span className="stat-title">Waitlist Signups</span>
          <span className="stat-value">{waitlist.length}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-title">Recent AI Extractions</span>
          <span className="stat-value">{stats.aiExtractions}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-title">Recent PDF Exports</span>
          <span className="stat-value">{stats.pdfExports}</span>
        </div>
      </div>

      <div className="admin-section">
        <h2>Clearinghouse Waitlist</h2>
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Email</th>
                <th>Clearinghouse Preference</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No signups yet.</td></tr>
              ) : (
                waitlist.map(lead => (
                  <tr key={lead.id}>
                    <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{lead.email}</td>
                    <td>{lead.clearinghouse || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <h2>Recent Activity Log (Milestones)</h2>
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User ID</th>
                <th>Action</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No activity logged yet.</td></tr>
              ) : (
                activities.map(act => (
                  <tr key={act.id}>
                    <td>{new Date(act.created_at).toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#64748b' }}>
                      {act.user_id ? act.user_id.substring(0, 8) + '...' : 'Guest'}
                    </td>
                    <td>
                      <span className={`action-badge action-${act.action}`}>{act.action}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {JSON.stringify(act.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
