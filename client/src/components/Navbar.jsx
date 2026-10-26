import React, { useState } from 'react';
import { Package, Truck, Search, LogIn, LayoutDashboard, Menu, X, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

export const Navbar = ({ activeTab, onNavigate, companySettings: propCompanySettings }) => {
  const { isAuthenticated, user } = useAuth();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandName = company.companyName || 'Courier & Logistics';

  const handleLinkClick = (tab, anchorId = null) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="public-header no-print">
      {/* Dynamic Top Announcement Bar (Controlled by Super Admin) */}
      {company.showAnnouncement !== false && company.announcementText && (
        <div
          className="top-announcement-bar"
          style={{
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderBottom: '1px solid #1e293b',
            padding: '0.35rem 1rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            minHeight: '32px',
          }}
        >
          <span
            style={{
              backgroundColor: '#1e3a8a',
              color: '#93c5fd',
              fontSize: '0.625rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              flexShrink: 0,
            }}
          >
            Announcement
          </span>
          <span
            style={{
              color: '#cbd5e1',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '650px',
            }}
          >
            {company.announcementText}
          </span>
          {company.announcementLink && (
            <a
              href={company.announcementLink}
              style={{
                color: '#60a5fa',
                fontWeight: 600,
                textDecoration: 'none',
                marginLeft: '0.25rem',
                flexShrink: 0,
              }}
              onClick={(e) => {
                if (company.announcementLink.startsWith('#')) {
                  e.preventDefault();
                  const targetId = company.announcementLink.replace('#', '');
                  handleLinkClick('home', targetId);
                }
              }}
            >
              Learn More &rarr;
            </a>
          )}
        </div>
      )}

      <div
        className="public-navbar"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand Logo & Title */}
        <div
          className="public-brand"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem' }}
          onClick={() => handleLinkClick('home')}
        >
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
              alt={brandName}
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
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderRadius: '6px',
              }}
            >
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              {brandName}
            </div>
            <div className="public-brand-sub" style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>
              {company.tagline || 'Parcel & Bus Dispatch Network'}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="public-nav-desktop">
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            <li>
              <a
                href="#home"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: activeTab === 'home' ? '#2563eb' : '#475569',
                  backgroundColor: activeTab === 'home' ? '#eff6ff' : 'transparent',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home');
                }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#services"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'services');
                }}
              >
                Services
              </a>
            </li>
            <li>
              <a
                href="#track"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: activeTab === 'track' ? '#2563eb' : '#475569',
                  backgroundColor: activeTab === 'track' ? '#eff6ff' : 'transparent',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('track');
                }}
              >
                Track Consignment
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'how-it-works');
                }}
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#network"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'network');
                }}
              >
                About Us
              </a>
            </li>
            <li>
              <a
                href="#contact"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'contact');
                }}
              >
                Help Desk
              </a>
            </li>
          </ul>
        </nav>

        {/* Right Action / Auth Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <button
              className="btn btn-primary btn-sm"
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
              onClick={() => onNavigate(user?.role === 'superadmin' ? 'superadmin' : 'portal')}
            >
              <LayoutDashboard size={14} />
              <span>{user?.role === 'superadmin' ? 'Super Console' : 'Operations Desk'}</span>
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
              onClick={() => onNavigate('login')}
            >
              <LogIn size={14} />
              <span>Staff Login</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            className="public-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="public-mobile-drawer">
          <a
            href="#home"
            className={`public-mobile-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home');
            }}
          >
            Home
          </a>
          <a
            href="#services"
            className="public-mobile-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'services');
            }}
          >
            Vendor Services
          </a>
          <a
            href="#track"
            className={`public-mobile-link ${activeTab === 'track' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('track');
            }}
          >
            Track Consignment
          </a>
          <a
            href="#how-it-works"
            className="public-mobile-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'how-it-works');
            }}
          >
            How It Works
          </a>
          <a
            href="#network"
            className="public-mobile-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'network');
            }}
          >
            About Us
          </a>
          <a
            href="#contact"
            className="public-mobile-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'contact');
            }}
          >
            Contact Help Desk
          </a>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
            {isAuthenticated ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(user?.role === 'superadmin' ? 'superadmin' : 'portal');
                }}
              >
                <LayoutDashboard size={15} />
                <span>{user?.role === 'superadmin' ? 'Open Super Console' : 'Open Operations Desk'}</span>
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('login');
                }}
              >
                <LogIn size={15} />
                <span>Staff / Admin Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
