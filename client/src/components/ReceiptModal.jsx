import React, { useState } from 'react';
import { Printer, ArrowLeft, Check, Scissors } from 'lucide-react';
import { useCompanySettings } from '../context/CompanyContext';

// Indian Number System Converter to Words (e.g., 450 -> "Rupees Four Hundred Fifty Only")
const numberToWordsIndian = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (val) => {
    if (val < 20) return a[val];
    const tens = b[Math.floor(val / 10)];
    const units = a[val % 10];
    return units ? `${tens} ${units}` : tens;
  };

  const convertThreeDigits = (val) => {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    let res = '';
    if (hundred > 0) res += `${a[hundred]} Hundred`;
    if (rest > 0) res += (res ? ' ' : '') + convertTwoDigits(rest);
    return res;
  };

  let crore = Math.floor(n / 10000000);
  let lakh = Math.floor((n % 10000000) / 100000);
  let thousand = Math.floor((n % 100000) / 1000);
  let hundred = n % 1000;

  let words = '';
  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (hundred > 0) words += `${convertThreeDigits(hundred)} `;

  return `Rupees ${words.trim()} Only`;
};

const ConsignmentBill = ({ booking, company, copyTitle, formattedDate, copyCount }) => {
  const isToPay = booking.paymentStatus === 'TO_PAY';
  // Parse origin station cleanly
  const rawFrom = booking.fromCity || booking.fromAddress || company.fromCity || '';
  const fromStation = (rawFrom || (booking.destination?.includes('→') ? booking.destination.split('→')[0].trim() : (booking.destination?.includes('->') ? booking.destination.split('->')[0].trim() : '')) || company.companyAddress || 'Origin Counter').trim();

  // Parse destination city cleanly (stripping any origin prefix)
  const rawDest = booking.destination || '';
  let cleanTo = booking.toCity || '';
  if (!cleanTo) {
    if (rawDest.includes('→')) cleanTo = rawDest.split('→').slice(1).join('→').trim();
    else if (rawDest.includes('->')) cleanTo = rawDest.split('->').slice(1).join('->').trim();
    else cleanTo = rawDest || 'Destination';
  }
  cleanTo = cleanTo.trim();

  const stopAddress = (booking.deliveryAddress || '').trim();
  const fullRoute = `${fromStation} → ${cleanTo}`;
  const fullToAddress = stopAddress && !stopAddress.toLowerCase().includes(cleanTo.toLowerCase())
    ? `${cleanTo} - ${stopAddress}`
    : (stopAddress || cleanTo);

  const items = Array.isArray(booking.items) && booking.items.length > 0
    ? booking.items
    : [
        {
          parcelType: booking.parcelType || 'Standard Package',
          quantity: booking.quantity || 1,
          weight: booking.weight || 0,
          charge: booking.amount,
          notes: booking.notes || '-',
        },
      ];

  const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const totalWeight = items.reduce((acc, it) => acc + (Number(it.weight) || 0), 0);

  return (
    <div className="bw-bill-box">
      {/* 1. Header Bar: Document Title & Copy Designation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #000000',
          backgroundColor: '#f8f8f8',
          padding: copyCount === 3 ? '2px 6px' : '4px 8px',
        }}
        className="bw-title-header"
      >
        <div style={{ fontWeight: 800, letterSpacing: '0.04em' }}>
          TAX INVOICE / CARGO CONSIGNMENT NOTE
        </div>
        <div
          style={{
            fontWeight: 800,
            textTransform: 'uppercase',
            border: '1px solid #000000',
            padding: '1px 6px',
            backgroundColor: '#ffffff',
          }}
        >
          {copyTitle}
        </div>
      </div>

      {/* 2. Company Details Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px solid #000000',
          padding: copyCount === 3 ? '3px 6px' : '6px 8px',
        }}
      >
        <div className="bw-company-title" style={{ fontWeight: 900, textTransform: 'uppercase' }}>
          {company.companyName || 'JAYANTH CARGO'}
        </div>
        <div style={{ fontSize: '0.9em', marginTop: '1px' }}>
          {company.tagline || 'Parcel & Bus Dispatch Services • Central Cargo Terminal'}
        </div>
        <div style={{ fontSize: '0.82em', color: '#111111' }}>
          {company.companyAddress && <span>{company.companyAddress} • </span>}
          <span>Phone: {company.companyPhone || '+91 9010253076'}</span>
          {company.companyEmail && <span> • Email: {company.companyEmail}</span>}
          {company.gstin && <span> • GSTIN: {company.gstin}</span>}
        </div>
      </div>

      {/* 3. Two-Column Metadata Box: Sender/Receiver & LR Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          borderBottom: '1px solid #000000',
        }}
      >
        {/* Left: Sender & Receiver Details */}
        <div
          style={{
            padding: copyCount === 3 ? '3px 6px' : '5px 8px',
            borderRight: '1px solid #000000',
          }}
        >
          {/* Sender / Consignor */}
          <div style={{ marginBottom: copyCount === 3 ? '2px' : '4px' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85em' }}>
              Consignor (Sender):
            </span>
            <div style={{ fontWeight: 700 }}>
              {booking.customerName}{' '}
              <span style={{ fontWeight: 600 }}>[Ph: {booking.customerPhone}]</span>
            </div>
            <div style={{ fontSize: '0.85em' }}>Origin Hub: {fromStation}</div>
          </div>

          {/* Receiver / Consignee */}
          <div style={{ borderTop: '1px dashed #666666', paddingTop: copyCount === 3 ? '2px' : '4px' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85em' }}>
              Consignee (Receiver):
            </span>
            <div style={{ fontWeight: 700 }}>
              {booking.receiverName || 'Counter Consignee'}{' '}
              <span style={{ fontWeight: 600 }}>[Ph: {booking.receiverPhone || 'N/A'}]</span>
            </div>
            <div style={{ fontSize: '0.85em' }}>
              Delivery Stop / To Address: <strong>{fullToAddress}</strong>
            </div>
          </div>
        </div>

        {/* Right: LR & Dispatch Details */}
        <div style={{ padding: copyCount === 3 ? '3px 6px' : '5px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>LR / Docket No:</span>
            <strong style={{ fontSize: '1.2em', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
              #{booking.orderId}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Booking Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Payment Mode:</span>
            <strong
              style={{
                textTransform: 'uppercase',
                border: '1px solid #000000',
                padding: '0 4px',
              }}
            >
              {isToPay ? 'TO PAY (ON DELIVERY)' : 'PAID (COUNTER CASH)'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Vehicle / Bus:</span>
            <span>{booking.busDetails?.busNumber || 'Scheduled Bus'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Booked By:</span>
            <span style={{ fontWeight: 600 }}>
              {booking.bookedByName || booking.createdBy?.name || 'Admin'}
              {' '}({(booking.bookedByRole || booking.createdBy?.role || 'admin').toLowerCase() === 'admin' ? 'Admin' : 'Staff'})
            </span>
          </div>
        </div>
      </div>

      {/* 4. Itemized Goods Table */}
      <table className="bw-table">
        <thead>
          <tr>
            <th style={{ width: '30px', textAlign: 'center' }}>#</th>
            <th>Description / Goods Type</th>
            <th style={{ width: '130px' }}>Route (From → To)</th>
            <th style={{ width: '70px', textAlign: 'center' }}>Weight</th>
            <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
            <th>Handling Remarks</th>
            <th style={{ width: '90px', textAlign: 'right' }}>Freight (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ fontWeight: 700 }}>{it.parcelType || 'General Parcel'}</td>
              <td>{fullRoute}</td>
              <td style={{ textAlign: 'center' }}>{it.weight ? `${it.weight} kg` : '-'}</td>
              <td style={{ textAlign: 'center' }}>{it.quantity || 1}</td>
              <td>{it.notes || '-'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                ₹{Number(it.charge || 0).toFixed(2)}
              </td>
            </tr>
          ))}
          {/* Total Row */}
          <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 800 }}>
            <td colSpan={3} style={{ textAlign: 'right', paddingRight: '8px' }}>
              TOTAL SUMMARY:
            </td>
            <td style={{ textAlign: 'center' }}>{totalWeight > 0 ? `${totalWeight} kg` : '-'}</td>
            <td style={{ textAlign: 'center' }}>{totalQuantity} pcs</td>
            <td style={{ textAlign: 'right', paddingRight: '8px' }}>GRAND TOTAL:</td>
            <td style={{ textAlign: 'right', fontSize: '1.05em' }}>
              ₹{Number(booking.amount || 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. Amount in Words & Payment Note Bar */}
      <div
        style={{
          padding: copyCount === 3 ? '2px 6px' : '4px 8px',
          borderBottom: '1px solid #000000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafafa',
          fontSize: '0.85em',
        }}
      >
        <div>
          <strong>Amount in Words: </strong>
          <em>{numberToWordsIndian(booking.amount)}</em>
        </div>
        <div>
          <strong>Payment: </strong>
          <span>{isToPay ? 'COLLECT CASH FROM CONSIGNEE' : 'PAID AT BOOKING COUNTER'}</span>
        </div>
      </div>

      {/* 6. Terms and Conditions & Signature Box */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
        }}
      >
        {/* Terms */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 6px' : '4px 8px',
            borderRight: '1px solid #000000',
            fontSize: copyCount === 3 ? '7.5px' : '8.5px',
            lineHeight: 1.25,
          }}
        >
          <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '1px' }}>
            Terms & Conditions:
          </div>
          <div>1. Goods carried strictly at owner's risk; company is not liable for leakage or breakage.</div>
          <div>2. Consignee must verify parcel condition at counter before delivery acknowledgment.</div>
          <div>3. Demurrage charged if parcel is uncollected within 24 hours of bus arrival.</div>
        </div>

        {/* Signature */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 6px' : '4px 8px',
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.85em' }}>
            For {company.companyName || 'JAYANTH CARGO'}
          </div>
          <div className="bw-signature-area" />
          <div style={{ fontSize: '0.8em', borderTop: '1px dotted #666666', paddingTop: '2px' }}>
            Authorized Signatory / Booking Counter
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReceiptModal = ({ booking, onClose, companySettings: propCompanySettings }) => {
  if (!booking) return null;

  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {
    companyName: 'JAYANTH CARGO',
    companyPhone: '+91 9010253076',
    companyAddress: 'Central Bus Terminal Office',
    companyEmail: 'jayanthyeswanth9@gmail.com',
    gstin: '',
  };

  // User selectable copies per A4 page: 1, 2, or 3 (Defaults to 2: Consignor & Consignee)
  const [copyCount, setCopyCount] = useState(2);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(booking.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Assign designations based on chosen copy count
  const getCopyList = () => {
    if (copyCount === 1) {
      return [{ title: 'Original Copy', id: 'original' }];
    }
    if (copyCount === 2) {
      return [
        { title: 'Consignor Copy (Sender)', id: 'consignor' },
        { title: 'Consignee Copy (Receiver)', id: 'consignee' },
      ];
    }
    return [
      { title: 'Consignor Copy (Sender)', id: 'consignor' },
      { title: 'Consignee Copy (Receiver)', id: 'consignee' },
      { title: 'Office / Admin Copy', id: 'admin' },
    ];
  };

  const copies = getCopyList();

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Top Action Bar (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
          backgroundColor: '#ffffff',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Interactive Copies Selector (Small Columns 1, 2, 3) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
            Copies per A4:
          </span>

          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              gap: '4px',
            }}
          >
            {[
              { count: 1, label: '1', title: '1 Copy (Full Page Original Consignment Note)' },
              { count: 2, label: '2', title: '2 Copies (Consignor & Consignee Halves)' },
              { count: 3, label: '3', title: '3 Copies (Consignor, Consignee & Admin Copy)' },
            ].map((opt) => (
              <button
                key={opt.count}
                type="button"
                onClick={() => setCopyCount(opt.count)}
                title={opt.title}
                style={{
                  border: 'none',
                  background: copyCount === opt.count ? '#0f172a' : 'transparent',
                  color: copyCount === opt.count ? '#ffffff' : '#475569',
                  fontWeight: copyCount === opt.count ? 800 : 600,
                  boxShadow: copyCount === opt.count ? '0 1px 3px rgba(15,23,42,0.2)' : 'none',
                  width: '32px',
                  height: '28px',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handlePrint}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Printer size={15} />
          <span>Print Bill</span>
        </button>
      </div>

      {/* Printable Area - Formatted on A4 Sheet */}
      <div
        className="printable-area"
        style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div className={`bw-invoice-wrapper bw-copies-${copyCount}`}>
          {copies.map((copyItem, index) => (
            <React.Fragment key={copyItem.id}>
              <ConsignmentBill
                booking={booking}
                company={company}
                copyTitle={copyItem.title}
                formattedDate={formattedDate}
                copyCount={copyCount}
              />
              {index < copies.length - 1 && (
                <div className="bw-cut-line">
                  <Scissors size={12} style={{ marginRight: '4px' }} />
                  <span>Cut Here</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ReceiptView = ReceiptModal;
