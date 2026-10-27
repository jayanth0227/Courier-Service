# 📦 Parcel & Bus Dispatch Management System

A complete, lightweight, professional operational management system designed specifically for local courier offices and bus parcel services. Built with a restrained, clean, and practical business interface for high-speed counter operations.

---

## ⚡ Key Highlights

* **Real-World Courier Flow**: Physical counter booking → 6-Digit Order ID → Pending Evening Dispatch queue → Bus Assignment → WhatsApp Customer Notification → Real-time Public Tracking → Destination Delivery.
* **Auto 6-Digit Order ID Generator**: Fast, collision-free numeric tracking numbers (e.g. `583214`).
* **Supported Parcels**: Rice Bags (25kg/50kg), Commercial Cartons, Boxes, Document Covers, and Heavy/Special Packages.
* **Bus Dispatch Module**: Operational pending queue with single and batch assignment (Bus Registration No, Route, Operator, Departure Time, Dispatch Notes).
* **Pluggable WhatsApp Notification Service**: Automatically sends formatted dispatch notifications with bus details and direct WhatsApp Web/App 1-click links (`https://wa.me/...`), configurable for Mock, Twilio, Meta Cloud API, or Custom Webhooks.
* **Counter Receipt Printing**: Clean consignment notes / bilty receipts formatted for thermal & standard A4 printing.
* **Reports & Financials**: Operational metrics, daily booking count, dispatched count, revenue totals, date range filters, and one-click CSV export.

---

## 🔐 Access Control

The platform provides multi-tier role-based access control (Platform Super Admin, Branch Manager / Admin, Counter Staff, and Drivers).

For initial setup, configure administrative credentials in your local `.env` file or onboard organizations via the Super Admin portal.

---

## 🚀 Getting Started

### 1. Environment Configuration (`.env`)
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
AWS_REGION=ap-south-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
DYNAMODB_TABLE_PREFIX=mrcargo_
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
WHATSAPP_PROVIDER=MOCK
```

### 2. Start Application

To run both Backend Server (Port 5000) and Frontend Client (Port 5173) together:
```bash
npm run dev
```

Or run them in separate terminals:
```bash
# Start Backend API
npm run server

# Start Frontend Client
npm run client
```

* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:5000`

---

## 📋 Operational Workflow & Features

### 1. Counter Booking
1. Staff opens **Create Booking**.
2. Enters Customer Name, Mobile Number, Destination Route, Delivery Address, Parcel Type, Quantity, Weight, and Delivery Charge.
3. Clicks **Generate 6-Digit Order ID & Book**.
4. System creates booking in `WAITING_FOR_BUS` state and shows immediate **Print Receipt** and **Send WhatsApp** actions.

### 2. Evening Bus Dispatch
1. Staff navigates to **Bus Dispatch**.
2. Selects one or multiple parcels waiting in the queue.
3. Enters Bus Number (e.g., `TS09UB4455`), Route, Operator, and Departure Time.
4. Clicks **Confirm Dispatch**.
5. System updates status to `DISPATCHED`, generates a dispatch manifest log, and triggers a WhatsApp notification to the customer.

### 3. Customer Tracking
1. Open the public homepage or **Track Parcel** page.
2. Enter the 6-digit Order ID (e.g. `583214`, `721903`, `631845`).
3. View clean vertical timeline with real-time status and bus registration details.
