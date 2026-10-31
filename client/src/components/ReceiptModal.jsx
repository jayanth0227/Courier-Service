import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Scissors, ShieldCheck } from 'lucide-react';
import { useCompanySettings } from '../context/CompanyContext';
import { api } from '../services/api';

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

// Default Bus Cargo Terms matching authentic reference waybill
const DEFAULT_BUS_TERMS = [
  "1) Luggage is transported at owners risk. Management will not be responsible for any loss that may occur due to delay, breakages, damages, theft, robbery, fire accident or any other reasons beyond our control.",
  "2) For any type of loss, company shall not be held liable for (i) any amount exceeding to Rs.1000/- for the loss in total. (ii) Rs.50/- per kg max upto Rs.1000/- whichever is less.",
  "3) Any amount paid as Octroi, Sales tax or other taxes will be collected from receiving party.",
  "4) Prohibited / Contraband articles, Jewellery and currency are not allowed & not accepted. In case of such events management will take legal action against both party.",
  "5) Company will not entertain any claim pertaining to loss of interest, Profitability & goods will under any circumstances.",
  "6) This agreement does not create any right which is covered under any carriers act, transfer of goods act or any other act time being in-force at the time of dispute.",
  "7) Management will not be responsible if goods are not taken within 5 days."
];



const ConsignmentBill = ({
  booking,
  company,
  superadminLogo = '/logo.png',
  copyTitle,
  copyBadge,
  showAmount,
  isDriverCopy,
  formattedDate,
  copyCount,
}) => {
  const isToPay = booking.paymentStatus === 'TO_PAY';

  // Booking date & time calculations matching reference layout
  const bookingDateObj = new Date(booking.createdAt || Date.now());
  const dateFormatted = `${String(bookingDateObj.getDate()).padStart(2, '0')}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${bookingDateObj.getFullYear()}`;
  const timeFormatted = bookingDateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  // Fetch admin signatory name from system settings, or fallback to bookedByName / Admin
  const adminSignatoryName = (company.receiptAdminName || '').trim() || booking.bookedByName || booking.createdBy?.name || 'Admin';
  const bookedByWithTime = `${adminSignatoryName} ${timeFormatted}`;

  // Parse origin and destination cities
  const fromCityName = (
    booking.fromCity ||
    (booking.destination?.includes('→') ? booking.destination.split('→')[0].trim() : '') ||
    company.fromCity ||
    'HYDERABAD'
  ).toUpperCase();

  const rawDest = booking.destination || '';
  let toCityName = booking.toCity || '';
  if (!toCityName) {
    if (rawDest.includes('→')) toCityName = rawDest.split('→').slice(1).join('→').trim();
    else if (rawDest.includes('->')) toCityName = rawDest.split('->').slice(1).join('->').trim();
    else toCityName = rawDest || 'DESTINATION';
  }
  toCityName = toCityName.toUpperCase();

  const originAddress =
    booking.fromAddress
      ? (booking.fromCity && !booking.fromAddress.toLowerCase().includes(booking.fromCity.toLowerCase())
          ? `${booking.fromAddress}, ${booking.fromCity}`
          : booking.fromAddress)
      : (company.companyAddress || 'Near Tabla Restaurant, Metro Piller No. 731, KPHB Colony, Main Road, Hyderabad-500 072');

  const stopAddress = (booking.deliveryAddress || '').trim();
  const fullToAddress =
    stopAddress && !stopAddress.toLowerCase().includes(toCityName.toLowerCase())
      ? `${toCityName} - ${stopAddress}`
      : stopAddress || toCityName;

  const bookingRemarks = (booking.remarks || booking.notes || '').trim();

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

  // Dynamic Terms & Conditions from Admin Settings - Show all clauses across all copies
  const dynamicTerms = company.termsAndConditions
    ? company.termsAndConditions
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : DEFAULT_BUS_TERMS;

  const travelsOperator =
    booking.busDetails?.operator ||
    booking.busDetails?.busName ||
    'TRAVELBUS';

  return (
    <div className={`bw-bill-box ${isDriverCopy ? 'bw-driver-copy' : ''}`}>
      {/* 1. Header Bar: Logo (Left) | Company & Dynamic Address (Center) | Travel Bus Sketch (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: copyCount === 3 ? '60px 1fr 70px' : '85px 1fr 95px',
          alignItems: 'center',
          borderBottom: '1px solid #000000',
          padding: copyCount === 3 ? '2px 5px' : '4px 8px',
          gap: '6px',
        }}
      >
        {/* Left: Organization / Deity Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {company.logoUrl && company.logoUrl !== '/logo.png' ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{
                maxHeight: copyCount === 3 ? '28px' : '46px',
                maxWidth: copyCount === 3 ? '55px' : '75px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: copyCount === 3 ? '32px' : '48px',
                height: copyCount === 3 ? '32px' : '48px',
                border: '1.5px solid #000000',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: copyCount === 3 ? '10px' : '14px',
                lineHeight: 1.1,
                textAlign: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <span>SV</span>
              <span style={{ fontSize: '7px', fontWeight: 700 }}>LOGISTICS</span>
            </div>
          )}
        </div>

        {/* Center: Company Name & Dynamic Header Address */}
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
            {company.companyName || 'SRI VINAYAKA LOGISTICS'}
          </div>
          <div
            style={{
              fontSize: copyCount === 3 ? '8.5px' : (copyCount === 2 ? '10px' : '11px'),
              fontWeight: 600,
              color: '#000000',
              marginTop: '1px',
              lineHeight: 1.25,
            }}
          >
            {(company.receiptAddress || '').trim() || originAddress}
          </div>
          <div
            style={{
              fontSize: copyCount === 3 ? '8px' : (copyCount === 2 ? '9.5px' : '10.5px'),
              color: '#000000',
              fontWeight: 700,
              marginTop: '1px',
              lineHeight: 1.2,
            }}
          >
            <span>Mobile No: {company.companyPhone || '9494958319'}</span>
          </div>
        </div>

        {/* Right: Super Admin Platform Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={superadminLogo || '/logo.png'}
            alt="Super Admin Logo"
            style={{
              maxHeight: copyCount === 3 ? '28px' : (copyCount === 2 ? '42px' : '48px'),
              maxWidth: copyCount === 3 ? '60px' : (copyCount === 2 ? '80px' : '90px'),
              objectFit: 'contain',
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.png';
            }}
          />
        </div>
      </div>

      {/* 2. Heading: .......Consignment Details ....... */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #000000',
          padding: copyCount === 3 ? '1px 4px' : '2px 8px',
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: copyCount === 3 ? '10px' : (copyCount === 2 ? '11.5px' : '13px'),
            letterSpacing: '0.04em',
            color: '#000000',
          }}
        >
          .......Consignment Details .......
        </span>
        {copyBadge && (
          <span
            style={{
              position: 'absolute',
              right: '6px',
              fontWeight: 800,
              fontSize: copyCount === 3 ? '8px' : '9.5px',
              textTransform: 'uppercase',
              border: '1px solid #000000',
              padding: '0 4px',
              backgroundColor: isDriverCopy ? '#000000' : '#ffffff',
              color: isDriverCopy ? '#ffffff' : '#000000',
              borderRadius: '2px',
            }}
          >
            {copyTitle || copyBadge}
          </span>
        )}
      </div>

      {/* 3. Consolidated 3-Column Main Table (Reference Image Structure) */}
      <div className="ref-table-wrapper" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', width: '100%', borderBottom: '1px solid #000000' }}>
        <table
          className="ref-bill-table"
          style={{
            width: '100%',
            height: '100%',
            borderCollapse: 'collapse',
            fontSize: copyCount === 3 ? '8.5px' : (copyCount === 2 ? '9.5px' : '11px'),
            lineHeight: copyCount === 3 ? 1.2 : 1.3,
            color: '#000000',
          }}
        >
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <tbody>
            {/* Line 1: Date | LR No | Freight Type (Highlighted) */}
            <tr style={{ borderBottom: '1px solid #000000' }}>
              <td style={{ borderRight: '1px solid #000000', padding: copyCount === 3 ? '2px 5px' : '3px 7px', fontWeight: 700 }}>
                Date : <span style={{ fontWeight: 900 }}>{dateFormatted}</span>
              </td>
              <td style={{ borderRight: '1px solid #000000', padding: copyCount === 3 ? '1.5px 4px' : '2px 7px', fontWeight: 900, verticalAlign: 'middle' }}>
                <span style={{ fontSize: copyCount === 3 ? '8.5px' : '10.5px', textTransform: 'uppercase', marginRight: '4px', letterSpacing: '0.04em' }}>
                  LR No :
                </span>
                <span
                  style={{
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    fontSize: copyCount === 3 ? '11.5px' : '14px',
                    letterSpacing: '0.08em',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    padding: copyCount === 3 ? '1.5px 6px' : '2px 9px',
                    borderRadius: '3px',
                    display: 'inline-block',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    border: '1px solid #000000',
                    lineHeight: 1.15,
                  }}
                >
                  {booking.orderId}
                </span>
              </td>
              <td
                style={{
                  padding: copyCount === 3 ? '2px 5px' : '3px 7px',
                  fontWeight: 900,
                  backgroundColor: isToPay ? '#ffffff' : '#f1f5f9',
                }}
              >
                Freight Type: <span style={{ textDecoration: 'underline' }}>{isToPay ? 'TO PAY' : 'PAID'}</span>
              </td>
            </tr>

            {/* Line 2: Consignor Cell | Consignee Cell | Freight Cell */}
            <tr style={{ borderBottom: '1px solid #000000' }}>
              {/* Col 1: From, Consignor, Mobile, GST in a single cell */}
              <td
                style={{
                  borderRight: '1px solid #000000',
                  padding: copyCount === 3 ? '3px 5px' : '4px 7px',
                  verticalAlign: 'top',
                }}
              >
                <div>From : <strong style={{ textTransform: 'uppercase' }}>{fromCityName}</strong></div>
                <div>Consignor: <strong>{booking.customerName}</strong></div>
                <div>Mobile No: <strong>{booking.customerPhone}</strong></div>
                <div>GST No: <span>{booking.senderGst || '-'}</span></div>
              </td>

              {/* Col 2: To, Consignee, Mobile, GST, Stop in a single cell */}
              <td
                style={{
                  borderRight: '1px solid #000000',
                  padding: copyCount === 3 ? '3px 5px' : '4px 7px',
                  verticalAlign: 'top',
                }}
              >
                <div>To: <strong style={{ textTransform: 'uppercase' }}>{toCityName}</strong></div>
                <div>Consignee: <strong>{booking.receiverName || 'Counter Consignee'}</strong></div>
                <div>Mobile No: <strong>{booking.receiverPhone || 'N/A'}</strong></div>
                <div>GST No: <span>{booking.receiverGst || '-'}</span></div>
                {stopAddress && (
                  <div style={{ fontSize: copyCount === 3 ? '7.5px' : '8.5px', marginTop: '1px' }}>
                    Stop: <strong>{fullToAddress}</strong>
                  </div>
                )}
                {bookingRemarks && (
                  <div style={{ fontSize: copyCount === 3 ? '7.5px' : '8.5px', marginTop: '1.5px', color: '#000000' }}>
                    Remarks: <strong>{bookingRemarks}</strong>
                  </div>
                )}
              </td>

              {/* Col 3: Freight Row */}
              <td
                style={{
                  padding: 0,
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: copyCount === 3 ? '3px 5px' : '4px 7px',
                    borderBottom: '1px solid #000000',
                    fontWeight: 700,
                  }}
                >
                  <span>Freight</span>
                  <span>
                    {showAmount
                      ? `${Number(booking.amount || 0).toFixed(2)}`
                      : '***'}
                  </span>
                </div>
              </td>
            </tr>

            {/* Line 3: Items Sub-Table (Col 1 & 2) | Total & Booked By (Col 3) */}
            <tr style={{ height: copyCount === 3 ? 'auto' : '100%', borderBottom: '1px solid #000000' }}>
              <td colSpan={2} style={{ borderRight: '1px solid #000000', padding: 0, verticalAlign: 'top', height: copyCount === 3 ? 'auto' : '100%' }}>
                <table style={{ width: '100%', height: copyCount === 3 ? 'auto' : '100%', borderCollapse: 'collapse', fontSize: copyCount === 3 ? '7.8px' : '9.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000000', backgroundColor: '#f8fafc', fontWeight: 800 }}>
                      <th style={{ width: '14%', borderRight: '1px solid #000000', padding: copyCount === 3 ? '1.5px 3px' : '2px 4px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '56%', borderRight: '1px solid #000000', padding: copyCount === 3 ? '1.5px 5px' : '2px 6px', textAlign: 'left' }}>Description</th>
                      <th style={{ width: '30%', padding: copyCount === 3 ? '1.5px 5px' : '2px 6px', textAlign: 'left' }}>INV / Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const itemVal = it.charge != null && it.charge !== ''
                        ? `₹${Number(it.charge).toFixed(2)}`
                        : (it.declaredValue != null && it.declaredValue !== ''
                            ? `₹${Number(it.declaredValue).toFixed(2)}`
                            : (it.amount != null && it.amount !== ''
                                ? `₹${Number(it.amount).toFixed(2)}`
                                : (items.length === 1 && booking.amount ? `₹${Number(booking.amount).toFixed(2)}` : '0.00')));
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                          <td style={{ borderRight: '1px solid #000000', padding: copyCount === 3 ? '1.5px 3px' : '3px 6px', textAlign: 'center', fontWeight: 800 }}>
                            {it.quantity || 1}
                          </td>
                          <td style={{ borderRight: '1px solid #000000', padding: copyCount === 3 ? '1.5px 5px' : '3px 8px', fontWeight: 700 }}>
                            <div>{it.parcelType || 'General Parcel'}{it.notes ? ` - ${it.notes}` : ''}</div>
                            {bookingRemarks && idx === 0 && (
                              <div style={{ fontSize: copyCount === 3 ? '7px' : '8.5px', color: '#000000', fontWeight: 600, marginTop: '1px' }}>
                                Remarks: <strong>{bookingRemarks}</strong>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: copyCount === 3 ? '1.5px 5px' : '3px 8px' }}>
                            <div>INV: {it.invoiceNumber || '-'}</div>
                            <div style={{ fontWeight: 800, marginTop: '0.5px' }}>
                              Value: {showAmount ? itemVal : '***'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Filler row ensuring vertical column borders span cleanly */}
                    <tr style={{ height: copyCount === 3 ? '4px' : '100%' }}>
                      <td style={{ borderRight: '1px solid #000000', padding: 0 }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', padding: 0 }}>&nbsp;</td>
                      <td style={{ padding: 0 }}>&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Col 3: Total & Staff Signature / Time */}
              <td style={{ padding: 0, verticalAlign: 'top', height: copyCount === 3 ? 'auto' : '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    height: '100%',
                    minHeight: copyCount === 3 ? '26px' : '52px',
                  }}
                >
                  <div style={{ flex: '1 1 auto', minHeight: copyCount === 3 ? '3px' : '24px' }}></div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: copyCount === 3 ? '2px 4px' : '4px 7px',
                      borderTop: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      fontWeight: 900,
                      fontSize: copyCount === 3 ? '8.5px' : '11px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <span>Total</span>
                    <span>
                      {showAmount
                        ? `${Number(booking.amount || 0).toFixed(2)}`
                        : '***'}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: copyCount === 3 ? '1.5px 3px' : '3px 6px',
                      fontSize: copyCount === 3 ? '7px' : '8.5px',
                      fontWeight: 700,
                      color: '#000000',
                      textAlign: 'right',
                    }}
                  >
                    {bookedByWithTime}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Terms and Conditions (Directly below table matching reference photo) */}
      <div
        style={{
          borderTop: '1px solid #000000',
          padding: copyCount === 3 ? '1.5px 4px' : '4px 8px',
          fontSize: copyCount === 3 ? '6.8px' : (copyCount === 2 ? '8.5px' : '9.5px'),
          lineHeight: copyCount === 3 ? 1.12 : 1.25,
          color: '#000000',
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: copyCount === 3 ? '0.5px' : '1px' }}>
          Goods booked At Owner's risk and said to contain basis.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: copyCount === 3 ? '0.2px' : '0.5px' }}>
          {dynamicTerms.map((term, i) => (
            <div key={i} style={{ color: '#000000' }}>
              {term}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: copyCount === 3 ? '1.5px' : '4px',
            paddingTop: copyCount === 3 ? '1px' : '2px',
          }}
        >
          <span style={{ fontWeight: 800 }}>
            Subject to {fromCityName || 'Hyderabad'} Jurisdiction.
          </span>
          <div style={{ display: 'flex', gap: copyCount === 3 ? '12px' : '20px', fontSize: copyCount === 3 ? '6.5px' : '8px', fontWeight: 600 }}>
            <span>Consignor Signature</span>
            <span>Authorized Signatory</span>
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
  const [superadminLogo, setSuperadminLogo] = useState('/logo.png');

  useEffect(() => {
    let isMounted = true;
    api.settings
      .getPublic()
      .then((res) => {
        if (isMounted && res && res.success && res.data && res.data.logoUrl) {
          setSuperadminLogo(res.data.logoUrl);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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
                superadminLogo={superadminLogo}
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
