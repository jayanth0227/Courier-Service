import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  Search,
  Filter,
  Clock,
  User,
  Globe,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';

export const AuditLogViewerModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ INFO: 0, WARN: 0, CRITICAL: 0 });
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: 15,
      };
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.auditLogs.list(params);
      if (res.success) {
        setLogs(res.data || []);
        if (res.metrics) setMetrics(res.metrics);
        if (res.pagination) {
          setPage(res.pagination.page);
          setTotalPages(res.pagination.pages);
          setTotalCount(res.pagination.total);
        }
      }
    } catch (err) {
      console.error('Failed to fetch security audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(1);
    }
  }, [isOpen, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  if (!isOpen) return null;

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <ShieldAlert size={12} /> CRITICAL
          </span>
        );
      case 'WARN':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <AlertTriangle size={12} /> WARN
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <ShieldCheck size={12} /> INFO
          </span>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b80',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Security Audit Log
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Immutable trail of authentication events, authorization checks, and administrative activities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Metric summary bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#0b1120',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>INFO EVENTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{metrics.INFO}</div>
          </div>
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WARNINGS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{metrics.WARN}</div>
          </div>
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>CRITICAL ALERTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{metrics.CRITICAL}</div>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search
                size={15}
                color="#64748b"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search username, IP, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '0.45rem 0.85rem',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Severity:</span>
            {['ALL', 'INFO', 'WARN', 'CRITICAL'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: severityFilter === sev ? '#38bdf8' : '#334155',
                  backgroundColor: severityFilter === sev ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  color: severityFilter === sev ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {sev}
              </button>
            ))}

            <button
              onClick={() => fetchLogs(page)}
              title="Refresh"
              style={{
                marginLeft: '0.5rem',
                padding: '0.4rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Logs table content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading audit trail records...</div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <div>No audit events matching criteria found.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Time</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Severity</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Event Action</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>User / Role</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>IP Address</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Metadata Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b50')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={12} color="#64748b" />
                        <span>{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{getSeverityBadge(log.severity)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={12} color="#64748b" />
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{log.username || 'system'}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({log.role})</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Globe size={12} color="#64748b" />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#94a3b8', maxWidth: '300px' }}>
                      <span
                        title={JSON.stringify(log.details || {})}
                        style={{
                          display: 'inline-block',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          backgroundColor: '#1e293b',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        {log.details && Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details)
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer pagination */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b50',
            fontSize: '0.8125rem',
            color: '#94a3b8',
          }}
        >
          <div>
            Showing {logs.length} of {totalCount} total security events
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: page <= 1 ? '#1e293b40' : '#1e293b',
                color: page <= 1 ? '#475569' : '#f8fafc',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchLogs(page + 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: page >= totalPages ? '#1e293b40' : '#1e293b',
                color: page >= totalPages ? '#475569' : '#f8fafc',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
