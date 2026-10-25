import React, { useState } from 'react';
import { Printer, ArrowLeft, Scissors, ShieldCheck } from 'lucide-react';
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

// Default Bus Cargo Terms Fallback if admin hasn't configured custom terms yet
const DEFAULT_BUS_TERMS = [
  "1. Goods carried strictly at owner's risk; company is not liable for leakage, breakage, or natural damages.",
  "2. Value of goods must be declared at booking; company liability for undeclared items is strictly limited to ₹500.",
  "3. Hazardous, contraband, inflammable, or prohibited goods are strictly not accepted.",
  "4. Demurrage will be levied if cargo is not claimed within 24 hours of bus arrival at destination.",
  "5. Consignee must verify package condition before counter delivery acknowledgment.",
  "6. Original LR copy or SMS verification must be produced at destination counter to claim consignment.",
  "7. All disputes are subject to local jurisdiction only."
];

const ConsignmentBill = ({
  booking,
  company,
  copyTitle,
  copyBadge,
  showAmount,
  isDriverCopy,
  formattedDate,
  copyCount,
}) => {
  const isToPay = booking.paymentStatus === 'TO_PAY';

  // Parse origin station cleanly
  const rawFrom = booking.fromCity || booking.fromAddress || company.fromCity || '';
  const fromStation = (
    rawFrom ||
    (booking.destination?.includes('→')
      ? booking.destination.split('→')[0].trim()
      : booking.destination?.includes('->')
      ? booking.destination.split('->')[0].trim()
      : '') ||
    company.companyAddress ||
    'Origin Counter'
  ).trim();

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
  const fullToAddress =
    stopAddress && !stopAddress.toLowerCase().includes(cleanTo.toLowerCase())
      ? `${cleanTo} - ${stopAddress}`
      : stopAddress || cleanTo;

  const items =
    Array.isArray(booking.items) && booking.items.length > 0
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

  // Dynamic Terms & Conditions from Admin Settings
  const dynamicTerms = company.termsAndConditions
    ? company.termsAndConditions
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : DEFAULT_BUS_TERMS;

  const travelsOperator =
    booking.busDetails?.operator ||
    booking.busDetails?.busName ||
    'BUS LOGISTICS DISPATCH';

  const busNumber = booking.busDetails?.busNumber || 'Scheduled Bus';

  return (
    <div className={`bw-bill-box ${isDriverCopy ? 'bw-driver-copy' : ''}`}>
      {/* 1. Header Bar: Authenticated Bus Cargo Header (Clean Centered Layout) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '70px 1fr 70px',
          alignItems: 'center',
          borderBottom: '1.5px solid #000000',
          padding: copyCount === 3 ? '2px 6px' : '4px 8px',
          gap: '8px',
        }}
      >
        {/* Left: Organization / Deity Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {company.logoUrl && company.logoUrl !== '/logo.png' ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{
                maxHeight: copyCount === 3 ? '30px' : '42px',
                maxWidth: '65px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: copyCount === 3 ? '34px' : '42px',
                height: copyCount === 3 ? '34px' : '42px',
                border: '1.5px solid #000000',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: copyCount === 3 ? '10px' : '13px',
                lineHeight: 1.1,
                textAlign: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <span>SV</span>
              <span style={{ fontSize: '7px', fontWeight: 700 }}>CARGO</span>
            </div>
          )}
        </div>

        {/* Center: Company Name & Fetched Origin Address Directly Below */}
        <div style={{ textAlign: 'center', padding: '0 4px' }}>
          <div
            className="bw-company-title"
            style={{
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.15,
            }}
          >
            {company.companyName || 'JAYANTH CARGO'}
          </div>
          {/* Fetched Origin Address directly below Company Title */}
          <div
            style={{
              fontSize: copyCount === 3 ? '10.5px' : (copyCount === 2 ? '12px' : '13px'),
              fontWeight: 800,
              marginTop: '1px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: '#000000',
            }}
          >
            {booking.fromAddress
              ? (booking.fromCity && !booking.fromAddress.toLowerCase().includes(booking.fromCity.toLowerCase())
                  ? `${booking.fromAddress}, ${booking.fromCity}`
                  : booking.fromAddress)
              : fromStation}
          </div>
          <div
            style={{
              fontSize: copyCount === 3 ? '9.5px' : (copyCount === 2 ? '10.5px' : '11.5px'),
              color: '#000000',
              fontWeight: 600,
              marginTop: '1px',
              lineHeight: 1.25,
            }}
          >
            <span>Ph: {company.companyPhone || '+91 9010253076'}</span>
            {company.gstin && <span> • GSTIN: {company.gstin}</span>}
            {company.companyEmail && <span> • {company.companyEmail}</span>}
          </div>
        </div>

        {/* Right: Symmetrical Empty Spacer (Travels badge removed) */}
        <div style={{ width: '70px' }} />
      </div>

      {/* 2. Banner: ....... Consignment Details ....... & Copy Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #000000',
          padding: copyCount === 3 ? '2px 6px' : '3px 8px',
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: copyCount === 3 ? '10px' : (copyCount === 2 ? '11px' : '12px'),
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#000000',
          }}
        >
          ....... Consignment Details .......
        </div>
        <div
          style={{
            fontWeight: 900,
            textTransform: 'uppercase',
            fontSize: copyCount === 3 ? '9.5px' : (copyCount === 2 ? '10.5px' : '11.5px'),
            border: '1px solid #000000',
            padding: '1px 6px',
            backgroundColor: isDriverCopy ? '#000000' : '#ffffff',
            color: isDriverCopy ? '#ffffff' : '#000000',
            borderRadius: '2px',
          }}
        >
          {copyTitle}
        </div>
      </div>

      {/* 3. Authentic 3-Column Metadata Box */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1.25fr 1fr',
          borderBottom: '1.5px solid #000000',
          fontSize: copyCount === 3 ? '9.5px' : (copyCount === 2 ? '10.5px' : '11.5px'),
          lineHeight: copyCount === 3 ? 1.22 : 1.32,
          color: '#000000',
        }}
      >
        {/* Col 1: Date, From Hub & Consignor (Sender) */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 5px' : '4px 7px',
            borderRight: '1px solid #000000',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#000000', fontWeight: 600 }}>Date:</span>
            <strong style={{ fontWeight: 800 }}>{formattedDate}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#000000', fontWeight: 600 }}>From Hub:</span>
            <strong style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: copyCount === 3 ? '10.5px' : '11.5px' }}>{fromStation}</strong>
          </div>

          <div style={{ borderTop: '1px dashed #666666', paddingTop: '2px', marginTop: '2px' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: copyCount === 3 ? '9.5px' : '10.5px' }}>
              Consignor (Sender):
            </div>
            <div style={{ fontWeight: 800, fontSize: copyCount === 3 ? '10.5px' : '12px' }}>{booking.customerName}</div>
            <div>
              <span style={{ color: '#000000', fontWeight: 600 }}>Ph:</span>{' '}
              <strong style={{ fontWeight: 800 }}>{booking.customerPhone}</strong>
            </div>
            {company.gstin && (
              <div style={{ fontSize: copyCount === 3 ? '9px' : '10px', color: '#000000' }}>
                GST: {booking.senderGst || company.gstin || '-'}
              </div>
            )}
          </div>
        </div>

        {/* Col 2: LR Docket No, To Hub & Consignee (Receiver) */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 5px' : '4px 7px',
            borderRight: '1px solid #000000',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ color: '#000000', fontWeight: 700 }}>LR Docket No:</span>
            <strong
              style={{
                fontFamily: 'monospace',
                fontSize: copyCount === 3 ? '13.5px' : (copyCount === 2 ? '15px' : '16.5px'),
                letterSpacing: '0.04em',
                fontWeight: 900,
                color: '#000000',
              }}
            >
              #{booking.orderId}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#000000', fontWeight: 600 }}>To Hub:</span>
            <strong style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: copyCount === 3 ? '10.5px' : '11.5px' }}>{cleanTo}</strong>
          </div>

          <div style={{ borderTop: '1px dashed #666666', paddingTop: '2px', marginTop: '2px' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: copyCount === 3 ? '9.5px' : '10.5px' }}>
              Consignee (Receiver):
            </div>
            <div style={{ fontWeight: 800, fontSize: copyCount === 3 ? '10.5px' : '12px' }}>
              {booking.receiverName || 'Counter Consignee'}
            </div>
            <div>
              <span style={{ color: '#000000', fontWeight: 600 }}>Ph:</span>{' '}
              <strong style={{ fontWeight: 800 }}>{booking.receiverPhone || 'N/A'}</strong>
            </div>
            <div style={{ fontSize: copyCount === 3 ? '9px' : '10px', marginTop: '1px' }}>
              <span style={{ color: '#000000', fontWeight: 600 }}>Stop:</span> <strong>{fullToAddress}</strong>
            </div>
          </div>
        </div>

        {/* Col 3: Freight Type, Amount & Transit Dispatch */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 5px' : '4px 7px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3px',
              }}
            >
              <span style={{ color: '#000000', fontWeight: 700 }}>Freight Type:</span>
              <strong
                style={{
                  textTransform: 'uppercase',
                  border: '1.5px solid #000000',
                  padding: '1px 6px',
                  backgroundColor: isToPay ? '#ffffff' : '#000000',
                  color: isToPay ? '#000000' : '#ffffff',
                  fontSize: copyCount === 3 ? '9.5px' : '10.5px',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                }}
              >
                {isToPay ? 'TO PAY' : 'PAID'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#000000', fontWeight: 600 }}>Freight:</span>
              <strong style={{ fontWeight: 800 }}>
                {showAmount ? `₹ ${Number(booking.amount || 0).toFixed(2)}` : '***'}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '3px',
                borderTop: '1px dotted #666666',
                paddingTop: '2px',
              }}
            >
              <span style={{ fontWeight: 800, color: '#000000' }}>Total:</span>
              <strong
                style={{
                  fontSize: copyCount === 3 ? '12px' : (copyCount === 2 ? '13px' : '14px'),
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: '#000000',
                }}
              >
                {showAmount ? `₹ ${Number(booking.amount || 0).toFixed(2)}` : '*** (Transit)'}
              </strong>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px dashed #666666',
              paddingTop: '2px',
              fontSize: copyCount === 3 ? '9px' : '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#000000', fontWeight: 600 }}>Booked By:</span>
              <span style={{ fontWeight: 700, color: '#000000' }}>
                {booking.bookedByName || booking.createdBy?.name || 'Admin'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
              <span style={{ color: '#000000', fontWeight: 600 }}>Bus / Vehicle:</span>
              <span style={{ fontWeight: 800, color: '#000000' }}>{busNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Goods Description Table */}
      <table className="bw-table">
        <thead>
          <tr>
            <th style={{ width: '30px', textAlign: 'center', color: '#000000' }}>Art</th>
            <th style={{ color: '#000000' }}>Description / Goods Type</th>
            <th style={{ width: '150px', color: '#000000' }}>Route (From → To)</th>
            <th style={{ width: '75px', textAlign: 'center', color: '#000000' }}>Actual Wt</th>
            <th style={{ width: '55px', textAlign: 'center', color: '#000000' }}>Qty</th>
            <th style={{ color: '#000000' }}>Handling Remarks</th>
            <th style={{ width: '100px', textAlign: 'right', color: '#000000' }}>Freight (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center', fontWeight: 800, color: '#000000' }}>{it.quantity || 1}</td>
              <td style={{ fontWeight: 800, color: '#000000' }}>{it.parcelType || 'General Parcel'}</td>
              <td style={{ fontWeight: 700, color: '#000000' }}>{fullRoute}</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: '#000000' }}>{it.weight ? `${it.weight} kg` : '-'}</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: '#000000' }}>{it.quantity || 1}</td>
              <td style={{ color: '#000000' }}>{it.notes || '-'}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#000000' }}>
                {showAmount ? `₹ ${Number(it.charge || 0).toFixed(2)}` : '***'}
              </td>
            </tr>
          ))}
          {/* Total Row */}
          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800, color: '#000000' }}>
            <td style={{ textAlign: 'center' }}>{totalQuantity}</td>
            <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '8px' }}>
              TOTAL SUMMARY ({totalQuantity} {totalQuantity === 1 ? 'Piece' : 'Pieces'})
            </td>
            <td style={{ textAlign: 'center' }}>{totalWeight > 0 ? `${totalWeight} kg` : '-'}</td>
            <td style={{ textAlign: 'center' }}>{totalQuantity} pcs</td>
            <td style={{ textAlign: 'right', paddingRight: '8px' }}>GRAND TOTAL:</td>
            <td style={{ textAlign: 'right', fontSize: copyCount === 3 ? '12px' : '13.5px', fontFamily: 'monospace', fontWeight: 900 }}>
              {showAmount ? `₹ ${Number(booking.amount || 0).toFixed(2)}` : '*** (Transit)'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. Amount in Words & Payment Instructions Bar */}
      <div
        style={{
          padding: copyCount === 3 ? '2px 6px' : '3px 8px',
          borderBottom: '1px solid #000000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafafa',
          fontSize: copyCount === 3 ? '9px' : (copyCount === 2 ? '10px' : '11px'),
          lineHeight: 1.25,
          color: '#000000',
        }}
      >
        <div style={{ flex: 1, paddingRight: '8px' }}>
          <strong style={{ fontWeight: 800 }}>Amount in Words: </strong>
          <span style={{ fontWeight: 700 }}>
            {showAmount
              ? numberToWordsIndian(booking.amount)
              : '*** DRIVER TRANSIT COPY (COMMERCIAL VALUATION MASKED - DETAILS & LR ONLY) ***'}
          </span>
        </div>
        <div style={{ whiteSpace: 'nowrap' }}>
          <strong style={{ fontWeight: 800 }}>Payment Mode: </strong>
          <span style={{ fontWeight: 800 }}>
            {isToPay
              ? 'TO PAY (COLLECT CASH AT DESTINATION)'
              : 'PAID (BOOKING COUNTER CASH)'}
          </span>
        </div>
      </div>

      {/* 6. Dynamic Terms & Conditions (Editable by Admin) & Dual Signatures */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.75fr 1fr',
          borderTop: 'none',
        }}
      >
        {/* Left: Dynamic Terms & Conditions / Privacy Policies from Database */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 5px' : '4px 7px',
            borderRight: '1px solid #000000',
            fontSize: copyCount === 3 ? '8px' : (copyCount === 2 ? '9px' : '10px'),
            lineHeight: copyCount === 3 ? 1.2 : 1.25,
            color: '#000000',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: '2px',
              color: '#000000',
              letterSpacing: '0.02em',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: copyCount === 3 ? '8.5px' : (copyCount === 2 ? '9.5px' : '10.5px'),
            }}
          >
            <span>Terms, Conditions & Carriage Policies:</span>
            <span style={{ fontWeight: 700, color: '#000000' }}>
              Subject to Local Jurisdiction
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            {dynamicTerms.map((term, i) => (
              <div key={i} style={{ marginBottom: '1px', fontWeight: 600 }}>
                {term}
              </div>
            ))}
          </div>

          {company.receiptFooterNote && (
            <div
              style={{
                marginTop: '2px',
                paddingTop: '2px',
                borderTop: '1px dotted #000000',
                fontWeight: 700,
                color: '#000000',
                fontSize: copyCount === 3 ? '8px' : '9px',
              }}
            >
              Notice: {company.receiptFooterNote}
            </div>
          )}
        </div>

        {/* Right: Dual Signatures (Consignor & Authorized Signatory) */}
        <div
          style={{
            padding: copyCount === 3 ? '2px 5px' : '4px 7px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              fontSize: copyCount === 3 ? '9px' : (copyCount === 2 ? '10px' : '11px'),
              fontWeight: 800,
              color: '#000000',
            }}
          >
            <div style={{ textAlign: 'left' }}>Consignor Signature</div>
            <div style={{ textAlign: 'right' }}>
              For {company.companyName || 'SRI VINAYAKA LOGISTICS'}
            </div>
          </div>

          <div
            className="bw-signature-area"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: '2px',
            }}
          >
            <div
              style={{
                width: '45%',
                borderBottom: '1px dotted #000000',
                height: copyCount === 3 ? '18px' : '28px',
              }}
            />
            <div
              style={{
                width: '45%',
                borderBottom: '1px dotted #000000',
                height: copyCount === 3 ? '18px' : '28px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: copyCount === 3 ? '8.5px' : (copyCount === 2 ? '9.5px' : '10.5px'),
              fontWeight: 700,
              color: '#000000',
            }}
          >
            <span>Customer / Sender</span>
            <span>Authorized Booking Clerk</span>
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
    companyName: 'SRI VINAYAKA LOGISTICS',
    companyPhone: '+91 9010253076',
    companyAddress: 'Central Bus Terminal Office',
    companyEmail: 'jayanthyeswanth9@gmail.com',
    gstin: '',
  };

  // User selectable copies per A4 page: 1, 2, or 3 (Defaults to 2: Consignor & Driver)
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

  // Assign copy list and amount visibility according to user specifications:
  // - 1 copy: Amount compulsory printed.
  // - 2 copies: 1st copy (Consignor) has amount, 2nd copy (Bus Driver) has NO amount.
  // - 3 copies: 1st & 2nd copies have amount, 3rd copy (Bus Driver) has NO amount.
  const getCopyList = () => {
    if (copyCount === 1) {
      return [
        {
          title: 'Original Consignment Note (With Amount)',
          copyBadge: 'Original Copy',
          showAmount: true,
          isDriverCopy: false,
          id: 'original',
          desc: 'Full Page Consignment Note with commercial amount printed.',
        },
      ];
    }
    if (copyCount === 2) {
      return [
        {
          title: '1 of 2 : Consignor Copy (With Amount)',
          copyBadge: 'Consignor Copy',
          showAmount: true,
          isDriverCopy: false,
          id: 'consignor',
          desc: 'Sender Copy with commercial rupee valuation and freight charges.',
        },
        {
          title: '2 of 2 : Bus Driver / Transit Waybill (No Amount)',
          copyBadge: 'Driver Transit Copy',
          showAmount: false,
          isDriverCopy: true,
          id: 'driver',
          desc: 'Bus Driver copy with details & LR only (Rupee amounts masked).',
        },
      ];
    }
    return [
      {
        title: '1 of 3 : Consignor Copy (With Amount)',
        copyBadge: 'Consignor Copy',
        showAmount: true,
        isDriverCopy: false,
        id: 'consignor',
        desc: 'Sender Copy with commercial rupee valuation.',
      },
      {
        title: '2 of 3 : Consignee / Counter Copy (With Amount)',
        copyBadge: 'Consignee Copy',
        showAmount: true,
        isDriverCopy: false,
        id: 'consignee',
        desc: 'Destination counter copy for delivery acknowledgment.',
      },
      {
        title: '3 of 3 : Bus Driver / Transit Waybill (No Amount)',
        copyBadge: 'Driver Transit Copy',
        showAmount: false,
        isDriverCopy: true,
        id: 'driver',
        desc: 'Bus Driver copy with details & LR only (Rupee amounts masked).',
      },
    ];
  };

  const copies = getCopyList();

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Top Action Bar (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
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

        {/* Interactive Copies Selector (1, 2, or 3) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
            A4 Print Copies:
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
              {
                count: 1,
                label: '1 Copy',
                title: '1 Copy (Full Page Original Consignment Note with Amount)',
              },
              {
                count: 2,
                label: '2 Copies (Consignor + Driver)',
                title: '2 Copies (Copy 1: with Amount | Copy 2: Driver Copy without Amount)',
              },
              {
                count: 3,
                label: '3 Copies (Consignor + Counter + Driver)',
                title: '3 Copies (Copies 1 & 2: with Amount | Copy 3: Driver Copy without Amount)',
              },
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
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
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

      {/* Copy Rule Notification Banner (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '1rem',
          fontSize: '0.80rem',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span>
            {copyCount === 1 && (
              <strong>Single Copy: Amount is printed compulsory on original consignment note.</strong>
            )}
            {copyCount === 2 && (
              <span>
                <strong>Multi-Copy Rule Active:</strong> Copy 1 (Consignor) contains amount. Copy 2 (Bus Driver) has <strong>amounts masked</strong> (only cargo details and LR number are shown for transit).
              </span>
            )}
            {copyCount === 3 && (
              <span>
                <strong>Multi-Copy Rule Active:</strong> Copies 1 & 2 contain amount. Copy 3 (Bus Driver) has <strong>amounts masked</strong> for privacy.
              </span>
            )}
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
          {copyCount === 1 ? '1 Half/Full A4' : `${copyCount} Slips on 1 A4 Sheet`}
        </span>
      </div>

      {/* Printable Area - Formatted on A4 Sheet */}
      <div
        className="printable-area"
        style={{
          backgroundColor: '#ffffff',
          padding: '0.75rem',
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
                copyBadge={copyItem.copyBadge}
                showAmount={copyItem.showAmount}
                isDriverCopy={copyItem.isDriverCopy}
                formattedDate={formattedDate}
                copyCount={copyCount}
              />
              {index < copies.length - 1 && (
                <div className="bw-cut-line">
                  <Scissors size={12} style={{ marginRight: '4px' }} />
                  <span>Cut Here • Hand copy below to Bus Driver</span>
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
