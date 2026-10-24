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
      <div className="public-navbar">
        {/* Brand Logo & Title */}
        <div
          className="public-brand"
          style={{ cursor: 'pointer' }}
          onClick={() => handleLinkClick('home')}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
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
              <Truck size={18} />
            </div>
          </div>
          <div>
            <div className="public-brand-title">{brandName}</div>
            <div className="public-brand-sub" style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>
              {company.tagline || 'Parcel & Bus Dispatch Network'}
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          className="public-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop / Tablet Navigation Links */}
        <nav className="public-nav-desktop">
          <ul className="public-nav-links">
            <li>
              <a
                href="#home"
                className={`public-nav-link ${activeTab === 'home' ? 'active' : ''}`}
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
                href="#track"
                className={`public-nav-link ${activeTab === 'track' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('track');
                }}
              >
                Track Parcel
              </a>
            </li>
            <li>
              <a
                href="#deliverable-locations"
                className="public-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'deliverable-locations');
                }}
              >
                Hubs & Locations
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="public-nav-link"
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
                href="#contact"
                className="public-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home', 'contact');
                }}
              >
                Contact
              </a>
            </li>
            <li>
              {isAuthenticated ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate(user?.role === 'superadmin' ? 'superadmin' : 'portal')}
                >
                  <LayoutDashboard size={14} />
                  {user?.role === 'superadmin'
                    ? 'SaaS Super Console'
                    : `Operations Desk (${user?.username || 'staff'})`}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('login')}
                >
                  <LogIn size={14} />
                  Staff / Admin Login
                </button>
              )}
            </li>
          </ul>
        </nav>
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
            href="#track"
            className={`public-mobile-link ${activeTab === 'track' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('track');
            }}
          >
            Track Parcel
          </a>
          <a
            href="#deliverable-locations"
            className="public-mobile-link"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'deliverable-locations');
            }}
          >
            Hubs & Deliverable Locations
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
                <span>{user?.role === 'superadmin' ? 'Open SaaS Console' : 'Open Operations Desk'}</span>
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
