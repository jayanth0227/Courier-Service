import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Calendar, IndianRupee, Package, ArrowRight, X, Printer, Plus, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const CustomersPage = ({ onOpenReceipt, onNavigateModule }) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Selected customer for history view
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.customers.list({ page, limit: 15, search: search.trim() });
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const handleViewCustomer = async (customer) => {
    try {
      setLoadingDetails(true);
      const res = await api.customers.getById(customer._id);
      if (res.success) {
        setSelectedCustomerData(res.data);
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch customer history', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (selectedCustomerData) {
    return (
      <div style={{ maxWidth: '950px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedCustomerData(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to All Customers</span>
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                {selectedCustomerData.customer.name}
              </h2>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Phone: <strong>{selectedCustomerData.customer.phone}</strong> • Total Bookings: <strong>{selectedCustomerData.customer.totalBookings}</strong> • Total Spent: <strong>₹{selectedCustomerData.customer.totalSpent}</strong>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0d2137' }}>
            Complete Consignment History ({selectedCustomerData.bookings?.length || 0})
          </h4>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Destination Route</th>
                  <th>Parcel Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Bus Number</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCustomerData.bookings || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No past bookings found for this customer.
                    </td>
                  </tr>
                ) : (
                  selectedCustomerData.bookings.map((b) => (
                    <tr key={b._id}>
                      <td><span className="order-id-badge">#{b.orderId}</span></td>
                      <td style={{ fontSize: '0.75rem' }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 500 }}>{b.destination}</td>
                      <td>{b.parcelType} ({b.quantity}x)</td>
                      <td style={{ fontWeight: 600 }}>₹{b.amount}</td>
                      <td>
                        <span className={`status-badge status-${b.status.toLowerCase()}`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>{b.busDetails?.busNumber || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReceipt(b)}
                          style={{ padding: '0.2rem 0.5rem' }}
                        >
                          <Printer size={13} />
                        </button>
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory & Consignment History</h1>
          <p className="page-subtitle">Frequent business senders, contact info, and lifetime freight statistics</p>
        </div>
        {onNavigateModule && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateModule('create-booking')}
          >
            <Plus size={15} />
            <span>New Booking</span>
          </button>
        )}
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search Customer Name, Phone, Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px' }}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            <Search size={14} />
            Search
          </button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer / Business Name</th>
              <th>Mobile Number</th>
              <th>WhatsApp</th>
              <th>Delivery / Billing Address</th>
              <th>Total Bookings</th>
              <th>Total Freight Spent</th>
              <th>Last Booking Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Loading customer directory...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong style={{ color: '#0d2137' }}>{c.name}</strong>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.phone}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{c.whatsapp || c.phone}</span>
                  </td>
                  <td style={{ fontSize: '0.75rem', maxWidth: '200px' }}>
                    {c.address || '-'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#1b3d63' }}>{c.totalBookings || 0} consignments</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    ₹{c.totalSpent?.toLocaleString('en-IN') || 0}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {c.lastBookingDate
                      ? new Date(c.lastBookingDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewCustomer(c)}
                    >
                      <span>Booking History</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Showing {customers.length} of {pagination.total || 0} customers (Page {pagination.page} of {pagination.pages || 1})
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchCustomers(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchCustomers(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
