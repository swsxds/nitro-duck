import React from 'react';
import Sidebar from './components/Sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <Sidebar />
          <main
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              padding: 16,
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
