import React from 'react';
import { Truck, Phone, Mail, MapPin, FileText, Info, Building2, Globe } from 'lucide-react';
import { useCompanySettings } from '../context/CompanyContext';

export const Footer = ({ onNavigate, companySettings: propCompanySettings }) => {
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const companyName = company.companyName || 'Courier & Logistics Services';
  const companyPhone = company.companyPhone || '+91 9347808545';
  const companyEmail = company.companyEmail || 'mrcargo59@gmail.com';
  const companyAddress = company.companyAddress || 'Hyderabad';
  const portfolioUrl = (company.portfolioUrl || '').trim();
  const gstin = company.gstin;

  return (
    <footer className="no-print" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '2.5rem 1.5rem 1.5rem 1.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem' }}>
        {/* Column 1: Platform Brand & Purpose */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
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
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                }}
              >
                <Truck size={16} />
              </div>
            </div>
            <div>
              <strong style={{ color: '#09090b', fontSize: '0.95rem', display: 'block', fontWeight: 700 }}>{companyName}</strong>
              <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>Multi-Vendor Logistics SaaS Platform</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.55 }}>
            Enterprise cloud management platform providing booking, manifest generation, live tracking, and dispatch automation for independent bus cargo operators and transport vendors.
          </p>
        </div>

        {/* Column 2: Navigation Links */}
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', marginBottom: '0.75rem' }}>Quick Navigation</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', padding: 0, margin: 0 }}>
            <li>
              <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Platform Home
              </a>
            </li>
            <li>
              <a href="#track" onClick={(e) => { e.preventDefault(); onNavigate('track'); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Track Consignment Status
              </a>
            </li>
            <li>
              <a href="#deliverable-locations" onClick={(e) => { e.preventDefault(); onNavigate('home'); setTimeout(() => document.getElementById('deliverable-locations')?.scrollIntoView({ behavior: 'smooth' }), 50); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                Operational Hubs & Routes
              </a>
            </li>
            <li>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 50); }} style={{ color: '#52525b', textDecoration: 'none' }}>
                How Platform Works
              </a>
            </li>
            <li>
              <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Vendor & Operator Portal Login →
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: SaaS Platform Provider & Vendor Inquiries */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <Building2 size={16} color="#2563eb" />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', margin: 0 }}>SaaS Platform & Vendor Enquiries</h4>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            We provide logistics software services to cargo vendors. Transport operators wanting software solutions or vendor partnership, reach our tech desk:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#52525b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} color="#2563eb" style={{ flexShrink: 0 }} />
              <span><strong>Vendor Hotline:</strong> {companyPhone}</span>
            </div>
            {companyEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                <span><strong>SaaS Solutions:</strong> {companyEmail}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Platform HQ:</strong> {companyAddress}</span>
            </div>
            {portfolioUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Portfolio:</strong>{' '}
                  <a
                    href={portfolioUrl.startsWith('http://') || portfolioUrl.startsWith('https://') ? portfolioUrl : `https://${portfolioUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    {portfolioUrl.replace(/^https?:\/\/(www\.)?/i, '') || 'View Portfolio'} ↗
                  </a>
                </span>
              </div>
            )}
            {gstin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 600 }}>
                <FileText size={14} color="#475569" style={{ flexShrink: 0 }} />
                <span>GSTIN: {gstin}</span>
              </div>
            )}
          </div>

          {/* Consignment Disambiguation Callout */}
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.55rem 0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.725rem',
              color: '#475569',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} color="#2563eb" />
              <span>For Parcel Delivery Status:</span>
            </div>
            Please contact the specific booking counter or vendor listed on your LR consignment receipt.
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '2rem auto 0 auto', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <div>© {new Date().getFullYear()} {companyName}. Multi-Vendor Cargo & Logistics Platform.</div>
        <div>New Vendor Onboarding & Tech Support Available</div>
      </div>
    </footer>
  );
};
