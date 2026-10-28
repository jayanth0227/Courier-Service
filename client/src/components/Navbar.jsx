import React, { useState, useEffect } from 'react';
import { Package, Truck, Search, LogIn, LayoutDashboard, Menu, X, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

export const Navbar = ({ activeTab, onNavigate, companySettings: propCompanySettings }) => {
  const { isAuthenticated, user } = useAuth();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(activeTab === 'track' ? 'track' : 'home');

  const brandName = company.companyName || 'Courier & Logistics';

  // Dynamic Scroll Spy to highlight active section in Navbar as user scrolls
  useEffect(() => {
    if (activeTab === 'track') {
      setActiveSection('track');
      return;
    }

    const sectionIds = ['contact', 'network', 'how-it-works', 'services', 'home'];
    const handleScroll = () => {
      // Offset point: 130px below top
      const scrollPos = window.scrollY + 130;
      let matched = 'home';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          matched = id;
          break;
        }
      }
      setActiveSection(matched);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const handleLinkClick = (tab, anchorId = null) => {
    setMobileMenuOpen(false);

    if (tab === 'track') {
      setActiveSection('track');
      onNavigate('track');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    onNavigate('home');
    if (anchorId) {
      setActiveSection(anchorId);
      setTimeout(() => {
        const element = document.getElementById(anchorId);
        if (element) {
          const headerOffset = 90; // Navbar height + breathing margin
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }
      }, 50);
    } else {
      setActiveSection('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="public-header-modern no-print">
      {/* Dynamic Top Announcement Bar (Hidden on Mobile) */}
      {company.showAnnouncement !== false && company.announcementText && (
        <div
          className="top-announcement-bar"
          style={{
            backgroundColor: '#f8fafc',
            color: '#18181b',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.35rem 1rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minHeight: '32px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#eef2ff',
              color: '#4338ca',
              fontSize: '0.625rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid #c7d2fe',
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4f46e5',
                display: 'inline-block',
                animation: 'pulse-glow 2s infinite',
              }}
            />
            <span>Announcement</span>
          </div>

          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <marquee
              behavior="scroll"
              direction="left"
              scrollamount="5"
              onMouseOver={(e) => e.target.stop && e.target.stop()}
              onMouseOut={(e) => e.target.start && e.target.start()}
              style={{
                display: 'flex',
                alignItems: 'center',
                color: '#334155',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: '1.5rem' }}>
                {company.announcementText}
              </span>
              {company.announcementLink && (
                <a
                  href={company.announcementLink}
                  style={{
                    color: '#4f46e5',
                    fontWeight: 700,
                    textDecoration: 'none',
                    marginRight: '2.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
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
            </marquee>
          </div>
        </div>
      )}

      <div className="public-navbar-container">
        {/* Modern Brand Logo & Title */}
        <div
          className="public-brand-modern"
          onClick={() => handleLinkClick('home')}
        >
          <div className="public-brand-logo-frame">
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
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                borderRadius: '6px',
              }}
            >
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="public-brand-name">
              {brandName}
            </div>
            <div className="public-brand-tagline">
              {company.tagline || 'Parcel & Bus Dispatch Network'}
            </div>
          </div>
        </div>

        {/* Desktop Segmented Pill Navigation Menu */}
        <nav className="public-nav-desktop">
          <div className="public-nav-pill-track">
            <a
              href="#home"
              className={`public-nav-pill-btn ${activeSection === 'home' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('home');
              }}
            >
              Home
            </a>
            <a
              href="#services"
              className={`public-nav-pill-btn ${activeSection === 'services' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('home', 'services');
              }}
            >
              Services
            </a>
            <a
              href="#track"
              className={`public-nav-pill-btn ${activeSection === 'track' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('track');
              }}
            >
              Track Consignment
            </a>
            <a
              href="#how-it-works"
              className={`public-nav-pill-btn ${activeSection === 'how-it-works' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('home', 'how-it-works');
              }}
            >
              How It Works
            </a>
            <a
              href="#network"
              className={`public-nav-pill-btn ${activeSection === 'network' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('home', 'network');
              }}
            >
              About Us
            </a>
            <a
              href="#contact"
              className={`public-nav-pill-btn ${activeSection === 'contact' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('home', 'contact');
              }}
            >
              Help Desk
            </a>
          </div>
        </nav>

        {/* Right Action / Mobile Hamburger Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <button
              className="navbar-desktop-action btn-sm"
              onClick={() => onNavigate(user?.role === 'superadmin' ? 'superadmin' : 'portal')}
            >
              <LayoutDashboard size={14} />
              <span>{user?.role === 'superadmin' ? 'Super Console' : 'Operations Desk'}</span>
            </button>
          ) : (
            <button
              className="navbar-desktop-action btn-sm"
              onClick={() => onNavigate('login')}
            >
              <LogIn size={14} />
              <span>Staff Login</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            className="public-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="public-mobile-drawer-modern">
          <a
            href="#home"
            className={`public-mobile-drawer-link ${activeSection === 'home' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home');
            }}
          >
            <span>Home</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>
          <a
            href="#services"
            className={`public-mobile-drawer-link ${activeSection === 'services' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'services');
            }}
          >
            <span>Services</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>
          <a
            href="#track"
            className={`public-mobile-drawer-link ${activeSection === 'track' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('track');
            }}
          >
            <span>Track Consignment</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>
          <a
            href="#how-it-works"
            className={`public-mobile-drawer-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'how-it-works');
            }}
          >
            <span>How It Works</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>
          <a
            href="#network"
            className={`public-mobile-drawer-link ${activeSection === 'network' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'network');
            }}
          >
            <span>About Us</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>
          <a
            href="#contact"
            className={`public-mobile-drawer-link ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', 'contact');
            }}
          >
            <span>Help Desk</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>&rarr;</span>
          </a>

          <div style={{ paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', marginTop: '0.35rem' }}>
            {isAuthenticated ? (
              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  fontWeight: 650,
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                }}
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
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  fontWeight: 650,
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                }}
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
