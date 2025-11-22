import React from 'react';

export default function Overview() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h1 style={{ margin: 0 }}>Overview</h1>
      <p style={{ margin: 0, color: '#4b5563', fontSize: 14 }}>
        Main dashboard with a quick summary of your lab activity.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginTop: 8,
        }}
      >
        <DashboardCard title="Running experiments" value="0" />
        <DashboardCard title="Saved protocols" value="0" />
        <DashboardCard title="Low stock items" value="0" />
        <DashboardCard title="Devices" value="0" />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 8,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>Recent activity</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          When you start creating experiments and protocols, recent actions will
          appear here.
        </p>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
