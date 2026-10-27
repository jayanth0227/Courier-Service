import React from 'react';
import { Truck, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useCompanySettings } from '../context/CompanyContext';

export const Footer = ({ onNavigate, companySettings: propCompanySettings }) => {
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const companyName = company.companyName || 'Courier & Logistics Services';
  const companyPhone = company.companyPhone || '';
  const companyEmail = company.companyEmail || '';
  const companyAddress = company.companyAddress || '';
  const gstin = company.gstin;

  return (
    <footer className="no-print" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '2.5rem 1.5rem 1.5rem 1.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                padding: '2px',
              }}
            >
              <img
                src={company.logoUrl || '/logo.png'}
                alt={companyName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                style={{
                  display: 'none',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                }}
              >
                <Truck size={15} />
              </div>
            </div>
            <div>
              <strong style={{ color: '#09090b', fontSize: '0.9375rem', display: 'block', fontWeight: 700 }}>{companyName}</strong>
              <div style={{ fontSize: '0.6875rem', color: '#71717a' }}>{company.tagline || 'Parcel & Bus Dispatch Network'}</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#71717a', lineHeight: 1.5 }}>
            Daily scheduled bus parcel & freight dispatch across major city routes. Fast, reliable, counter-to-counter courier service.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', marginBottom: '0.75rem' }}>Direct Links</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8125rem' }}>
            <li>
              <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Home
              </a>
            </li>
            <li>
              <a href="#track" onClick={(e) => { e.preventDefault(); onNavigate('track'); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Track Order ID
              </a>
            </li>
            <li>
              <a href="#deliverable-locations" onClick={(e) => { e.preventDefault(); onNavigate('home'); setTimeout(() => document.getElementById('deliverable-locations')?.scrollIntoView({ behavior: 'smooth' }), 50); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Hubs & Locations
              </a>
            </li>
            <li>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 50); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                How It Works
              </a>
            </li>
            <li>
              <a href="#contact" onClick={(e) => { e.preventDefault(); onNavigate('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 50); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Customer Help Desk
              </a>
            </li>
            <li>
              <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                Staff Portal Login →
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', marginBottom: '0.75rem' }}>Office & Contact</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#52525b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} color="#4f46e5" />
              <span>{companyPhone}</span>
            </div>
            {companyEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={14} color="#1b3d63" />
                <span>{companyEmail}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} color="#1b3d63" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{companyAddress}</span>
            </div>
            {gstin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 600 }}>
                <FileText size={14} color="#475569" />
                <span>GSTIN: {gstin}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '2rem auto 0 auto', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <div>© {new Date().getFullYear()} {companyName}. All rights reserved.</div>
        <div>Operational Hours: 06:00 AM – 10:30 PM (7 Days a Week)</div>
      </div>
    </footer>
  );
};
