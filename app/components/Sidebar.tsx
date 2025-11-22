'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Overview',
    icon: (
      <span
        style={{
          display: 'inline-flex',
          width: 18,
          height: 18,
          borderRadius: '999px',
          border: '1.5px solid #4b5563',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
        }}
      >
        ⌾
      </span>
    ),
  },
  {
    href: '/experiment',
    label: 'Experiments',
    icon: (
      <span
        style={{
          fontSize: 16,
          display: 'inline-flex',
          width: 18,
          justifyContent: 'center',
        }}
      >
        ✏️
      </span>
    ),
  },
  {
    href: '/protocols',
    label: 'Protocols',
    icon: (
      <span
        style={{
          fontSize: 16,
          display: 'inline-flex',
          width: 18,
          justifyContent: 'center',
        }}
      >
        📎
      </span>
    ),
  },
  {
    href: '/stock',
    label: 'Stock',
    icon: (
      <span
        style={{
          fontSize: 16,
          display: 'inline-flex',
          width: 18,
          justifyContent: 'center',
        }}
      >
        📋
      </span>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: 220,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        padding: '16px 12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 4px 8px',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 8,
            backgroundColor: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: 'white',
            fontWeight: 700,
          }}
        >
          N
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: '#111827',
          }}
        >
          NitroDuck
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                color: active ? '#111827' : '#4b5563',
                backgroundColor: active ? '#e5edf8' : 'transparent',
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
