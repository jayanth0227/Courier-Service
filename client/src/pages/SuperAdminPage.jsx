import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  Search,
  Plus,
  Edit,
  Key,
  LogIn,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Globe,
  Bus,
  Mail,
  Phone,
  MapPin,
  Lock,
  BarChart3,
  Shield,
  Layers,
  ArrowRight,
  Save,
  Building,
  Upload,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shuffle,
  MessageSquare,
  ExternalLink,
  RotateCcw,
  Menu,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCompanySettings } from '../context/CompanyContext';
import { OrganizationDetailView } from '../components/superadmin/OrganizationDetailView';
import { WhatsAppConfigModal } from '../components/superadmin/WhatsAppConfigModal';

export const SuperAdminPage = ({ onNavigatePortal, onOpenTenantPortal, onNavigatePublic }) => {
  const { user, logout, impersonateTenant } = useAuth();
  const { showToast } = useToast();
  const { setCompanySettings: setGlobalCompanySettings, refreshCompanySettings } = useCompanySettings();

  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'analytics' | 'cms'
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);

  // Organization Detailed Drilldown State
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantOverview, setTenantOverview] = useState(null);
  const [tenantOverviewLoading, setTenantOverviewLoading] = useState(false);
  const [whatsappConfigTenant, setWhatsappConfigTenant] = useState(null);
  const [emailSending, setEmailSending] = useState(false);

  // Vendor Onboarding Inquiries & Leads State
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('ALL');

  // Website CMS & Company Profile State (Super Admin Only)
  const [cmsSettings, setCmsSettings] = useState({
    companyName: '',
    logoUrl: '/logo.png',
    tagline: 'Parcel & Bus Dispatch Network',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    gstin: '',
    receiptFooterNote: '',
    announcementText: 'Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts.',
    announcementLink: '#services',
    showAnnouncement: true,
    heroBadge: 'Verified Counter-to-Counter Parcel Network',
    heroTitle: 'Premier Bus Parcel & Logistics Network',
    heroSubtitle: 'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.',
    heroPrimaryCtaText: 'Operations Portal',
    heroPrimaryCtaLink: '#login',
    heroSecondaryCtaText: 'Track Consignment',
    heroSecondaryCtaLink: '#track',
    heroStats: [
      { label: 'Active Hubs', value: '8+', subtext: 'Connected Destination Cities' },
      { label: 'Daily Fleet', value: '180+', subtext: 'Scheduled Bus Dispatches' },
      { label: 'All Cargo', value: '100%', subtext: 'Standard Freight Categories' },
      { label: 'Verified SLA', value: '99.8%', subtext: 'Handover & Timely Delivery' },
    ],
    servicesTitle: 'Enterprise Bus Parcel Services for Commercial Vendors',
    servicesSubtitle: 'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.',
    services: [
      {
        id: 'whatsapp-service',
        title: 'Automated WhatsApp Notifications',
        description: 'The moment a parcel is booked, an automated WhatsApp alert is dispatched to both sender and consignee with the 6-digit LR tracking number and live status link.',
        badge: 'Instant Delivery Alert',
        icon: 'MessageSquare',
        highlight: true,
      },
      {
        id: 'tracking-service',
        title: 'Zero-Friction Parcel Tracking',
        description: 'Customers and vendors easily track consignments in real-time using their 6-digit Order ID, displaying assigned bus number, driver dispatch contact, and destination counter.',
        badge: 'Real-Time Telemetry',
        icon: 'Search',
        highlight: true,
      },
      {
        id: 'batch-assign-service',
        title: 'Assign Multiple Parcels to Bus at a Time',
        description: 'Counter dispatchers can batch-select dozens of waiting parcels for any destination city and allocate them to a scheduled passenger bus luggage bay in one click.',
        badge: 'Bulk Bay Dispatch',
        icon: 'Bus',
        highlight: true,
      },
      {
        id: 'counter-booking-service',
        title: 'Counter Booking Engine for Vendors',
        description: 'High-speed counter interface for commercial merchants: auto-generates 6-digit Order IDs, calculates weight-based or category pricing, and prints receipts instantly.',
        badge: 'High Speed Booking',
        icon: 'Package',
        highlight: false,
      },
      {
        id: 'staff-minimal-access',
        title: 'Staff Login with Minimal Scoped Access',
        description: 'Counter clerks, loading supervisors, and delivery operators log in with strictly scoped permissions to create bookings and load buses without accessing corporate financials.',
        badge: 'Role Security',
        icon: 'ShieldCheck',
        highlight: false,
      },
      {
        id: 'scheduled-bus-network',
        title: 'Daily Scheduled Passenger Bus Connectivity',
        description: 'Leveraging existing high-frequency intercity passenger bus timetables, providing faster turnaround and lower demurrage than conventional slow trucking networks.',
        badge: 'Express Transit',
        icon: 'Truck',
        highlight: false,
      },
    ],
    howItWorksTitle: 'How It Works: Step-by-Step Logistics Workflow',
    howItWorksSubtitle: 'From counter parcel booking to verified destination counter handover across our scheduled bus network.',
    howItWorksSteps: [
      {
        stepNumber: 1,
        title: 'Book Parcel & Generate 6-Digit Order ID',
        description: 'The vendor presents goods at the origin hub counter. The counter staff records destination, weight, and parties, instantly generating an official 6-digit LR tracking ID.',
        tag: '1. Booking',
      },
      {
        stepNumber: 2,
        title: 'Automated WhatsApp Message Delivered',
        description: 'System automatically sends a structured WhatsApp message to the consignor and consignee containing consignment details and a single-click live tracking link.',
        tag: '2. WhatsApp Alert',
      },
      {
        stepNumber: 3,
        title: 'Assign Multiple Parcels to Bus Bay',
        description: 'Hub staff groups queued parcels by destination route and batch-assigns them to a scheduled passenger bus with a generated driver dispatch manifest.',
        tag: '3. Fleet Assignment',
      },
      {
        stepNumber: 4,
        title: 'Intercity Bus Transit & Live Monitoring',
        description: 'The parcel travels inside the secure luggage bay of the scheduled bus. Both vendor and customer monitor transit progress and arrival ETA online.',
        tag: '4. Transit',
      },
      {
        stepNumber: 5,
        title: 'Destination Counter Verification & Handover',
        description: 'Upon bus arrival at the destination terminal, counter staff unloads cargo. Consignee presents the 6-digit Order ID or WhatsApp receipt for verified handover.',
        tag: '5. Handover',
      },
    ],
    vendorBenefitsTitle: 'Why Leading Commercial Vendors Choose Us',
    vendorBenefits: [
      {
        title: 'Same-Day & Overnight Passenger Bus Timings',
        description: 'Eliminates regional warehouse consolidation delays. Your parcels travel directly on express passenger bus schedules.',
      },
      {
        title: 'Zero WhatsApp Overhead for Merchants',
        description: 'No manual photo-sharing or texting waybills. Customers receive automated WhatsApp confirmation and tracking links instantly.',
      },
      {
        title: 'Bulk Dispatch Tools for High-Volume Shippers',
        description: 'Assign dozens of cartons and sacks across multiple departure routes within seconds with complete digital manifests.',
      },
      {
        title: 'Minimal Operator Training Required',
        description: 'Staff portals are intuitive and role-restricted, allowing counter clerks to execute bookings and dispatches with zero friction.',
      },
    ],
  });
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsSaving, setCmsSaving] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [resetPasswordTenant, setResetPasswordTenant] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Helpers for unique ID and temporary password generation
  const generateUniqueTenantId = (name = '') => {
    let prefix = 'CR';
    if (name && name.trim().length >= 2) {
      const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (clean.length >= 2) {
        prefix = clean.slice(0, 2);
      }
    } else {
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      prefix = `${alpha[Math.floor(Math.random() * alpha.length)]}${alpha[Math.floor(Math.random() * alpha.length)]}`;
    }
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${num}`;
  };

  const generateTempPassword = () => {
    const prefixes = ['Temp', 'Pass', 'Fast', 'Admin'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${p}#${num}`;
  };

  // Streamlined New Tenant Form state
  const [formData, setFormData] = useState({
    companyName: '',
    uniqueId: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    plan: 'PRO',
    adminUsername: '',
    adminPassword: '',
    address: '',
    adminBranch: '',
  });

  const handleOpenAddModal = () => {
    const initialId = generateUniqueTenantId();
    const initialPass = generateTempPassword();
    setFormData({
      companyName: '',
      uniqueId: initialId,
      slug: initialId.toLowerCase(),
      contactEmail: '',
      contactPhone: '',
      plan: 'PRO',
      adminUsername: '',
      adminPassword: initialPass,
      address: '',
      adminBranch: 'Central Hub',
    });
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCopyText = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(''), 2500);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes] = await Promise.all([
        api.superadmin.getStats(),
        api.superadmin.getTenants(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (tenantsRes.success) {
        setTenants(tenantsRes.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load Super Admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full details and analytics for an individual organization
  const fetchTenantOverview = async (tenantId) => {
    if (!tenantId) return;
    try {
      setTenantOverviewLoading(true);
      const res = await api.superadmin.getTenantById(tenantId);
      if (res && res.success && res.data) {
        setTenantOverview(res.data);
      } else {
        showToast(res?.message || 'Failed to fetch organization overview', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch organization overview', 'error');
    } finally {
      setTenantOverviewLoading(false);
    }
  };

  const handleOpenTenantDetail = (tenantId) => {
    setSelectedTenantId(tenantId);
    fetchTenantOverview(tenantId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedTenantId(null);
    setTenantOverview(null);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchCmsSettings();
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setInquiriesLoading(true);
      let apiInquiries = [];
      let apiNewCount = 0;
      try {
        const res = await api.inquiries.list();
        if (res && res.success && Array.isArray(res.data)) {
          apiInquiries = res.data;
          apiNewCount = res.newCount !== undefined ? res.newCount : res.data.filter((i) => i.status === 'New').length;
        }
      } catch (apiErr) {
        console.warn('API fetchInquiries warning:', apiErr);
      }

      // Merge with localStorage inquiries (for resilience)
      let localInquiries = [];
      try {
        localInquiries = JSON.parse(localStorage.getItem('mrcargo_inquiries') || '[]');
      } catch {
        localInquiries = [];
      }

      const mergedMap = new Map();
      apiInquiries.forEach((item) => mergedMap.set(item.referenceNumber || item._id, item));
      localInquiries.forEach((item) => {
        const key = item.referenceNumber || item._id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      });

      const finalInquiries = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setInquiries(finalInquiries);
      setNewInquiriesCount(finalInquiries.filter((i) => i.status === 'New').length);
    } catch (err) {
      console.warn('Failed to load inquiries:', err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleUpdateInquiryStatus = async (id, status) => {
    try {
      if (id && !id.startsWith('inq_')) {
        await api.inquiries.update(id, { status });
      }
      showToast(`Inquiry status updated to ${status}`, 'success');
      setInquiries((prev) => prev.map((inq) => (inq._id === id ? { ...inq, status } : inq)));
      setNewInquiriesCount((prev) => (status !== 'New' ? Math.max(0, prev - 1) : prev));

      // Also update local storage copy
      try {
        const localList = JSON.parse(localStorage.getItem('mrcargo_inquiries') || '[]');
        const updatedLocal = localList.map((inq) => (inq._id === id ? { ...inq, status } : inq));
        localStorage.setItem('mrcargo_inquiries', JSON.stringify(updatedLocal));
      } catch {
        // Ignore
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const fetchCmsSettings = async () => {
    try {
      setCmsLoading(true);
      const res = await api.superadmin.getSettings();
      if (res && res.success && res.data) {
        setCmsSettings((prev) => ({
          ...prev,
          companyName: res.data.companyName || prev.companyName,
          logoUrl: res.data.logoUrl || prev.logoUrl || '/logo.png',
          tagline: res.data.tagline || prev.tagline,
          companyPhone: res.data.companyPhone || prev.companyPhone,
          companyEmail: res.data.companyEmail || prev.companyEmail,
          companyAddress: res.data.companyAddress || prev.companyAddress,
          gstin: res.data.gstin || prev.gstin,
          receiptFooterNote: res.data.receiptFooterNote || prev.receiptFooterNote,
          announcementText: res.data.announcementText || prev.announcementText,
          announcementLink: res.data.announcementLink || prev.announcementLink,
          showAnnouncement: res.data.showAnnouncement !== undefined ? res.data.showAnnouncement : prev.showAnnouncement,
          heroBadge: res.data.heroBadge || prev.heroBadge,
          heroTitle: res.data.heroTitle || prev.heroTitle,
          heroSubtitle: res.data.heroSubtitle || prev.heroSubtitle,
          heroPrimaryCtaText: res.data.heroPrimaryCtaText || prev.heroPrimaryCtaText,
          heroPrimaryCtaLink: res.data.heroPrimaryCtaLink || prev.heroPrimaryCtaLink,
          heroSecondaryCtaText: res.data.heroSecondaryCtaText || prev.heroSecondaryCtaText,
          heroSecondaryCtaLink: res.data.heroSecondaryCtaLink || prev.heroSecondaryCtaLink,
          heroStats: (res.data.heroStats && res.data.heroStats.length > 0) ? res.data.heroStats : prev.heroStats,
          servicesTitle: res.data.servicesTitle || prev.servicesTitle,
          servicesSubtitle: res.data.servicesSubtitle || prev.servicesSubtitle,
          services: (res.data.services && res.data.services.length > 0) ? res.data.services : prev.services,
          howItWorksTitle: res.data.howItWorksTitle || prev.howItWorksTitle,
          howItWorksSubtitle: res.data.howItWorksSubtitle || prev.howItWorksSubtitle,
          howItWorksSteps: (res.data.howItWorksSteps && res.data.howItWorksSteps.length > 0) ? res.data.howItWorksSteps : prev.howItWorksSteps,
          vendorBenefitsTitle: res.data.vendorBenefitsTitle || prev.vendorBenefitsTitle,
          vendorBenefits: (res.data.vendorBenefits && res.data.vendorBenefits.length > 0) ? res.data.vendorBenefits : prev.vendorBenefits,
        }));
      }
    } catch (err) {
      console.warn('Failed to load CMS settings:', err);
    } finally {
      setCmsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cms') {
      fetchCmsSettings();
    } else if (activeTab === 'inquiries') {
      fetchInquiries();
    }
  }, [activeTab]);

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setCmsSettings((prev) => ({ ...prev, logoUrl: base64 }));
      showToast('Logo image uploaded! Click Save to apply changes across the platform.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCmsSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!cmsSettings.companyName.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }

    try {
      setCmsSaving(true);
      const res = await api.superadmin.updateSettings(cmsSettings);
      if (res && res.success) {
        showToast('Company Profile & Website CMS updated successfully!', 'success');
        if (setGlobalCompanySettings) {
          setGlobalCompanySettings(res.data);
        }
        if (refreshCompanySettings) {
          refreshCompanySettings();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to save Company Profile & CMS', 'error');
    } finally {
      setCmsSaving(false);
    }
  };

  const handleResetCmsDefaults = async () => {
    if (!window.confirm('Reset all public website headlines, metrics, vendor services, and workflow steps to Enterprise SaaS defaults?')) {
      return;
    }

    try {
      setCmsSaving(true);
      const res = await api.superadmin.resetCmsDefaults();
      if (res && res.success && res.data) {
        setCmsSettings((prev) => ({
          ...prev,
          ...res.data,
        }));
        showToast('Website CMS reset to Enterprise SaaS standard presets!', 'success');
        if (setGlobalCompanySettings) {
          setGlobalCompanySettings(res.data);
        }
        if (refreshCompanySettings) {
          refreshCompanySettings();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset CMS defaults', 'error');
    } finally {
      setCmsSaving(false);
    }
  };

  // Handle New Tenant submit (Streamlined with automated Unique ID and Temp Password)
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.uniqueId.trim() || !formData.contactEmail.trim() || !formData.contactPhone.trim() || !formData.adminUsername.trim() || !formData.adminPassword.trim()) {
      showToast('Please fill in all required fields (Organization Name, Unique ID, Email, Phone, Username, Temporary Password)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanId = formData.uniqueId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const payload = {
        companyName: formData.companyName.trim(),
        uniqueId: cleanId,
        slug: cleanId.toLowerCase(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        plan: formData.plan || 'PRO',
        adminUsername: formData.adminUsername.trim().toLowerCase(),
        adminPassword: formData.adminPassword.trim(),
        address: (formData.address || '').trim() || 'Central Bus Terminal Office',
        adminBranch: (formData.adminBranch || '').trim() || 'Central Hub',
      };

        const res = await api.superadmin.createTenant(payload);
        if (res.success) {
          showToast(res.message || 'Tenant onboarded successfully!', 'success');
          setIsAddModalOpen(false);
          setCreatedCredentials({
            id: res.data?.tenant?._id,
            tenantId: res.data?.tenant?._id,
            companyName: payload.companyName,
            uniqueId: res.data?.tenant?.uniqueId || payload.uniqueId,
            username: payload.adminUsername,
            password: payload.adminPassword,
            email: payload.contactEmail,
            phone: payload.contactPhone,
            plan: payload.plan,
            address: payload.address,
            branch: payload.adminBranch,
            emailSent: res.emailDispatch?.success,
          });
          fetchDashboardData();
        }
      } catch (err) {
        showToast(err.message || 'Failed to onboard tenant', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Resend or dispatch credentials welcome email
    const handleSendCredentialsEmail = async (tenantOrCreds) => {
      const tenantId = tenantOrCreds?._id || tenantOrCreds?.tenantId || tenantOrCreds?.id;
      if (!tenantId) {
        showToast('Unable to identify organization ID for email dispatch', 'error');
        return;
      }
      try {
        setEmailSending(true);
        const res = await api.superadmin.sendTenantCredentials(tenantId, {
          customPassword: tenantOrCreds.password || tenantOrCreds.temporaryPassword,
          recipientEmail: tenantOrCreds.email || tenantOrCreds.contactEmail,
        });
        if (res.success) {
          showToast(res.message || 'Credentials & company banner email dispatched successfully!', 'success');
        } else {
          showToast(res.message || 'Failed to dispatch email', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Failed to dispatch credentials email', 'error');
      } finally {
        setEmailSending(false);
      }
    };

  // Handle Permanent Delete Tenant
  const handleDeleteTenant = async () => {
    if (!deleteConfirmTenant) return;
    try {
      setIsDeleting(true);
      const res = await api.superadmin.deleteTenant(deleteConfirmTenant._id);
      if (res.success) {
        showToast(res.message || `Organization '${deleteConfirmTenant.companyName}' permanently deleted`, 'success');
        if (selectedTenantId && (selectedTenantId === deleteConfirmTenant._id || selectedTenantId === deleteConfirmTenant.id)) {
          handleBackToList();
        }
        setDeleteConfirmTenant(null);
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete organization', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Edit Tenant submit
  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      setIsSubmitting(true);
      const res = await api.superadmin.updateTenant(editingTenant._id, editingTenant);
      if (res.success) {
        showToast('Tenant updated successfully', 'success');
        setEditingTenant(null);
        fetchDashboardData();
        if (selectedTenantId && (selectedTenantId === editingTenant._id || selectedTenantId === editingTenant.id)) {
          fetchTenantOverview(selectedTenantId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to update tenant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Password submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordTenant || !newPassword) return;

    try {
      setIsSubmitting(true);
      const res = await api.superadmin.resetPassword(resetPasswordTenant._id, newPassword);
      if (res.success) {
        showToast(res.message || 'Password reset successfully', 'success');
        setResetPasswordTenant(null);
        setNewPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 1-Click Impersonation
  const handleImpersonate = async (tenantId) => {
    try {
      showToast('Opening tenant operations workspace...', 'info');
      await impersonateTenant(tenantId);
      if (refreshCompanySettings) {
        await refreshCompanySettings();
      }
      if (onOpenTenantPortal) {
        onOpenTenantPortal('dashboard');
      } else if (onNavigatePortal) {
        onNavigatePortal('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
    } catch (err) {
      showToast(err.message || 'Failed to impersonate tenant', 'error');
    }
  };

  // Toggle Suspend/Active
  const handleToggleStatus = async (tenant) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.superadmin.updateTenant(tenant._id, { status: nextStatus });
      if (res.success) {
        showToast(`Tenant status changed to ${nextStatus}`, 'success');
        fetchDashboardData();
        if (selectedTenantId && (selectedTenantId === tenant._id || selectedTenantId === tenant.id)) {
          fetchTenantOverview(selectedTenantId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.companyName?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.contactEmail?.toLowerCase().includes(q) ||
      t.contactPhone?.includes(q) ||
      t.adminUser?.username?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || t.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="portal-layout-topbar">
      {/* 1. Universal Top Navigation Bar */}
      <header className="portal-topnav no-print">
        {/* Tier 1: Platform Brand, Environment Badge, Time & Logout */}
        <div className="portal-topnav-main">
          {/* Brand & Identity */}
          <div
            className="portal-brand-area"
            onClick={() => {
              setActiveTab('tenants');
              setSelectedTenantId(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="portal-brand-logo-wrap">
              <img
                src={cmsSettings.logoUrl || '/logo.png'}
                alt={cmsSettings.companyName || 'Logo'}
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
                  color: '#4f46e5',
                }}
              >
                <Shield size={22} />
              </div>
            </div>
            <div className="portal-brand-text-container">
              <div className="portal-brand-title">
                {cmsSettings.companyName || 'Mr Cargo'}
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#4338ca',
                    backgroundColor: '#eef2ff',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #c7d2fe',
                    marginLeft: '8px',
                    letterSpacing: '0.04em',
                    verticalAlign: 'middle',
                  }}
                >
                  SUPER ADMIN
                </span>
              </div>
              {cmsSettings.tagline && (
                <span className="portal-brand-tagline-badge">
                  <span className="portal-brand-tagline-dot" />
                  {cmsSettings.tagline}
                </span>
              )}
            </div>
          </div>

          {/* Status Indicators & Action Controls */}
          <div className="portal-meta-bar">
            <div className="portal-clock-pill" title="System Live Time">
              <Clock size={13} color="#71717a" />
              <span>{timeStr}</span>
            </div>

            {onNavigatePublic && (
              <button
                type="button"
                onClick={onNavigatePublic}
                className="portal-globe-btn"
                title="View Website & Tracking"
              >
                <Globe size={13} />
                <span>Website</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchDashboardData}
              className="portal-globe-btn"
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            {activeTab === 'tenants' && !selectedTenantId && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setFormData({
                    companyName: '',
                    uniqueId: generateUniqueTenantId(''),
                    slug: '',
                    contactEmail: '',
                    contactPhone: '',
                    address: '',
                    plan: 'PROFESSIONAL',
                    adminUsername: '',
                    adminPassword: generateTempPassword(),
                  });
                  setIsAddModalOpen(true);
                }}
                title="Onboard New Organization"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.775rem',
                  boxShadow: '0 1px 2px rgba(79, 70, 229, 0.25)',
                }}
              >
                <Plus size={14} />
                <span>+ Onboard Business</span>
              </button>
            )}

            <div className="portal-operator-pill">
              <Shield size={14} color="#4338ca" />
              <span>Super Administrator</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="portal-logout-btn"
              title="Logout"
            >
              <Power size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Module Navigation Tabs Bar */}
        <nav className="portal-nav-bar">
          <div
            className={`portal-nav-item ${activeTab === 'tenants' && !selectedTenantId ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tenants');
              setSelectedTenantId(null);
            }}
          >
            <Building2 size={16} />
            <span>Courier Organizations</span>
            {tenants.length > 0 && <span className="portal-nav-badge">{tenants.length}</span>}
          </div>

          <div
            className={`portal-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analytics');
              setSelectedTenantId(null);
            }}
          >
            <BarChart3 size={16} />
            <span>Platform Analytics</span>
          </div>

          <div
            className={`portal-nav-item ${activeTab === 'cms' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('cms');
              setSelectedTenantId(null);
            }}
          >
            <Globe size={16} />
            <span>Company Profile & Website CMS</span>
          </div>

          <div
            className={`portal-nav-item ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('inquiries');
              setSelectedTenantId(null);
            }}
          >
            <MessageSquare size={16} />
            <span>Vendor Inquiries & Leads</span>
            {newInquiriesCount > 0 && (
              <span
                className="portal-nav-badge"
                style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#059669', fontWeight: 800 }}
              >
                {newInquiriesCount}
              </span>
            )}
          </div>
        </nav>
      </header>

      {/* 2. Main Workspace */}
      <main className="portal-content" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* Page Header (Hidden when viewing dedicated organization details) */}
        {!selectedTenantId && (
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                {activeTab === 'tenants'
                  ? 'Registered Courier Organizations'
                  : activeTab === 'analytics'
                  ? 'Platform Operations & Revenue Analytics'
                  : activeTab === 'inquiries'
                  ? 'Commercial Vendor Inquiries & Inbound Leads'
                  : 'Company Profile & Website CMS Management'}
              </h1>
              <p className="page-subtitle" style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '3px' }}>
                {activeTab === 'tenants'
                  ? 'Manage independent courier businesses, configure service limits, access branch portals, and onboard new organizations.'
                  : activeTab === 'analytics'
                  ? 'Platform-wide consignment totals, gross logistics freight revenue, and fleet utilization across all tenants.'
                  : activeTab === 'inquiries'
                  ? 'Direct inbound inquiries submitted via the public home page: vendor parcel booking contracts, bus fleet integrations, and terminal counter requests.'
                  : 'Super Admin exclusive control: customize platform logo, company sub-tagline, contact helpline, branch address, and receipt terms.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
              {activeTab === 'inquiries' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchInquiries}
                  disabled={inquiriesLoading}
                >
                  <RefreshCw size={14} className={inquiriesLoading ? 'spin' : ''} />
                  <span>Refresh Leads</span>
                </button>
              ) : activeTab === 'cms' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchCmsSettings}
                  disabled={cmsLoading}
                >
                  <RefreshCw size={14} className={cmsLoading ? 'spin' : ''} />
                  <span>Reload Profile</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchDashboardData}
                    disabled={loading}
                  >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    <span>Refresh Data</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAddModal}
                  >
                    <Plus size={15} />
                    <span>Onboard New Tenant</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4 Executive KPI Metric Cards (Only shown on tenants & analytics views) */}
        {activeTab !== 'cms' && activeTab !== 'inquiries' && !selectedTenantId && (
          <div className="dashboard-stats-grid" style={{ marginBottom: '1.25rem' }}>
          {/* Card 1: Total Tenants */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Courier Tenants</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <Building2 size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.totalTenants || tenants.length || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Active: {stats?.activeTenants || 0} organizations</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Live</span>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Active Subscriptions</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#059669' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.activeTenants || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Suspended: {stats?.suspendedTenants || 0}</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>100% Operational</span>
            </div>
          </div>

          {/* Card 3: Total Bookings */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Platform Consignments</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#2563eb' }}>
                <Package size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.totalBookings || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dispatches: {stats?.totalDispatches || 0}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Across all tenants</span>
            </div>
          </div>

          {/* Card 4: Gross Freight Volume */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Gross Platform Revenue</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#d97706' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-card-value">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>All Tenancies Combined</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Consolidated Volume</span>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'tenants' ? (
          selectedTenantId ? (
            <OrganizationDetailView
              tenantId={selectedTenantId}
              data={tenantOverview}
              loading={tenantOverviewLoading}
              onBack={handleBackToList}
              onRefresh={() => fetchTenantOverview(selectedTenantId)}
              onImpersonate={handleImpersonate}
              onEditTenant={(t) => setEditingTenant(t)}
              onResetPassword={(t) => {
                setResetPasswordTenant(t);
                setNewPassword('');
              }}
              onToggleStatus={(t) => handleToggleStatus(t)}
              onDeleteTenant={(t) => setDeleteConfirmTenant(t)}
              onConfigureWhatsApp={(t) => setWhatsappConfigTenant(t)}
              onSendCredentialsMail={handleSendCredentialsEmail}
              onCopyText={handleCopyText}
              copiedKey={copiedKey}
            />
          ) : (
            <>
            {/* Search and Filters Bar */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by company name, slug, phone, email, or admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2rem' }}
                />
                <Search
                  size={15}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>

              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <select
                className="form-control"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="ALL">All Plans</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              {(searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setPlanFilter('ALL');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Organizations Table Container */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  Registered Courier Organizations ({filteredTenants.length})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Live Data Isolated per Tenant ID
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company / Organization</th>
                      <th>Plan</th>
                      <th>Admin Account</th>
                      <th>Usage Metrics</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Overview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                          Loading tenant directory...
                        </td>
                      </tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                          No courier organizations match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => {
                        const planColor =
                          t.plan === 'ENTERPRISE'
                            ? { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }
                            : t.plan === 'PRO'
                            ? { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
                            : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

                        const isActive = t.status === 'ACTIVE';

                        return (
                          <tr
                            key={t._id}
                            onClick={() => handleOpenTenantDetail(t._id)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view organization details, analytics & staff"
                          >
                            {/* Company Name, Unique ID & Contact - Clickable to open details page */}
                            <td>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: '#1d4ed8',
                                  fontSize: '0.875rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <span style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                  {t.companyName}
                                </span>
                                <ArrowRight size={13} color="#2563eb" />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    backgroundColor: '#f8fafc',
                                    color: '#1e3a5f',
                                    borderRadius: '3px',
                                    border: '1px solid #cbd5e1',
                                    letterSpacing: '0.04em',
                                  }}
                                  title="Automated Unique Organization ID"
                                >
                                  ID: {t.uniqueId || t.slug?.toUpperCase()}
                                </span>
                                {t.contactPhone && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    • {t.contactPhone}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Plan Badge */}
                            <td>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: planColor.bg,
                                  color: planColor.text,
                                  border: `1px solid ${planColor.border}`,
                                }}
                              >
                                {t.plan || 'PRO'}
                              </span>
                            </td>

                            {/* Admin User */}
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                                {t.adminUser?.name || 'Administrator'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                @{t.adminUser?.username || 'admin'} • {t.adminUser?.email || t.contactEmail}
                              </div>
                            </td>

                            {/* Usage Metrics */}
                            <td>
                              <div style={{ fontSize: '0.8125rem', color: '#0f172a', display: 'flex', gap: '0.75rem' }}>
                                <span>
                                  <strong>{t.metrics?.bookingsCount ?? 0}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Bookings</span>
                                </span>
                                <span>
                                  <strong>{t.metrics?.busesCount ?? 0}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Buses</span>
                                </span>
                                <span>
                                  <strong>{t.metrics?.staffCount ?? 1}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Staff</span>
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                                  color: isActive ? '#065f46' : '#991b1b',
                                  border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#10b981' : '#ef4444',
                                  }}
                                />
                                {t.status}
                              </span>
                            </td>

                            {/* Action - WhatsApp config + View details */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWhatsappConfigTenant(t);
                                  }}
                                  title="Configure WhatsApp & OpenWA Gateway for this Organization"
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#059669',
                                    backgroundColor: '#ecfdf5',
                                    borderColor: '#a7f3d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <MessageSquare size={13} />
                                  <span>WhatsApp</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTenantDetail(t._id);
                                  }}
                                  title="Open Organization Overview & Analytics"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#1d4ed8',
                                    backgroundColor: '#eff6ff',
                                    borderColor: '#bfdbfe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>View Details</span>
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
          )
        ) : (
          /* Platform Analytics View (Matches style of Reports & Dashboard) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {/* Box 1: Plan Breakdown */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                Subscription Plan Distribution
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Active tier allocation across all courier business tenancies
              </div>

              {['BASIC', 'PRO', 'ENTERPRISE'].map((plan) => {
                const count = tenants.filter((t) => (t.plan || 'PRO') === plan).length;
                const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
                return (
                  <div key={plan} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{plan}</span>
                      <span style={{ color: '#64748b' }}>
                        {count} tenants ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: plan === 'ENTERPRISE' ? '#7c3aed' : plan === 'PRO' ? '#2563eb' : '#64748b',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Box 2: Top Active Tenants by Consignment Volume */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                Top Tenancies by Consignments
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                Organizations generating the highest parcel traffic
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...tenants]
                  .sort((a, b) => (b.metrics?.bookingsCount || 0) - (a.metrics?.bookingsCount || 0))
                  .slice(0, 5)
                  .map((t, idx) => (
                    <div
                      key={t._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.625rem 0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: idx === 0 ? '#fef3c7' : '#f1f5f9',
                            color: idx === 0 ? '#92400e' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>
                            {t.companyName}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            slug: {t.slug}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {t.metrics?.bookingsCount || 0}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>consignments</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Company Profile & Website CMS (Super Admin Exclusive) */}
        {activeTab === 'cms' && (
          <div style={{ maxWidth: '1050px', margin: '0 auto', paddingBottom: '3rem' }}>
            <form onSubmit={handleSaveCmsSettings}>
              {/* CMS Control Header & Action Bar */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                    <Globe size={18} color="#2563eb" />
                    <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                      Public Website CMS & Platform Content
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    Control all homepage text, vendor services, 5-step operational workflow, and business details.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (onNavigatePublic) {
                        onNavigatePublic('home');
                      } else {
                        window.location.hash = '#home';
                      }
                    }}
                    title="Open live public homepage"
                  >
                    <ExternalLink size={14} />
                    <span>Preview Public Site</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetCmsDefaults}
                    disabled={cmsSaving || cmsLoading}
                    title="Restore recommended SaaS presets for vendor bus parcel courier"
                  >
                    <RotateCcw size={14} />
                    <span>Reset to SaaS Presets</span>
                  </button>

                  <button type="submit" className="btn btn-primary btn-sm" disabled={cmsSaving || cmsLoading}>
                    <Save size={14} />
                    <span>{cmsSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
                  </button>
                </div>
              </div>

              {/* CARD 1: Top Announcement Bar & Brand Identity */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Building size={18} color="#0f172a" />
                  <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                    Brand Identity & Top Announcement Bar
                  </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Top-level branding and alert banner displayed above the public header.
                </p>

                {/* Announcement Bar Settings */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                      Top Announcement Banner
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={cmsSettings.showAnnouncement !== false}
                        onChange={(e) => setCmsSettings({ ...cmsSettings, showAnnouncement: e.target.checked })}
                      />
                      <span>Enable Announcement Banner</span>
                    </label>
                  </div>

                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Banner Text Notice</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts."
                        value={cmsSettings.announcementText || ''}
                        onChange={(e) => setCmsSettings({ ...cmsSettings, announcementText: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Banner Target Link (Anchor or URL)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="#services or #contact"
                        value={cmsSettings.announcementLink || ''}
                        onChange={(e) => setCmsSettings({ ...cmsSettings, announcementLink: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Previews & File Upload */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Light Header Preview
                      </div>
                      <div
                        style={{
                          width: '140px',
                          height: '75px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={cmsSettings.logoUrl || '/logo.png'}
                          alt="Logo Light Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Dark Portal TopNav Preview
                      </div>
                      <div
                        style={{
                          width: '140px',
                          height: '75px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          backgroundColor: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={cmsSettings.logoUrl || '/logo.png'}
                          alt="Logo Dark Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Upload New Logo Image (PNG / JPG / SVG)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="form-control"
                      style={{ padding: '6px 8px', fontSize: '0.8125rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setCmsSettings((prev) => ({ ...prev, logoUrl: '/sv-logo.png' }));
                          showToast('Selected Sleek SV Logistics Logo! Click Save to apply.', 'success');
                        }}
                      >
                        Use Sleek SV Logo
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setCmsSettings((prev) => ({ ...prev, logoUrl: '/logo.png' }));
                          showToast('Reset to default logo. Click Save to apply.', 'success');
                        }}
                      >
                        Reset to Default Logo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Custom Logo Image URL / Path (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="/logo.png or https://example.com/logo.png"
                      value={cmsSettings.logoUrl || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Brand Sub-Tagline</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Parcel & Bus Dispatch Network"
                      value={cmsSettings.tagline || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, tagline: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: Hero Section & KPI Milestone Statistics */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <TrendingUp size={18} color="#0f172a" />
                  <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                    Hero Section & KPI Milestone Statistics
                  </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Headline, value proposition, CTA buttons, and the 4 metric counters displayed in the hero section.
                </p>

                <div className="form-group">
                  <label className="form-label">Hero Badge Text</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Verified Counter-to-Counter Parcel Network"
                    value={cmsSettings.heroBadge || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, heroBadge: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Main Hero Headline</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Premier Bus Parcel & Logistics Network"
                    value={cmsSettings.heroTitle || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, heroTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Hero Subtitle / Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe how commercial vendors book parcels on scheduled buses and how customers track."
                    value={cmsSettings.heroSubtitle || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, heroSubtitle: e.target.value })}
                  />
                </div>

                {/* 4 Hero KPI Milestone Stats */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.75rem' }}>
                    4 Key Hero Metric Counters
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    {(cmsSettings.heroStats || []).map((stat, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '0.75rem',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                          Metric Tile #{idx + 1}
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Value (e.g. 180+)"
                          style={{ marginBottom: '4px', fontWeight: 700 }}
                          value={stat.value || ''}
                          onChange={(e) => {
                            const updated = [...cmsSettings.heroStats];
                            updated[idx] = { ...updated[idx], value: e.target.value };
                            setCmsSettings({ ...cmsSettings, heroStats: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Label (e.g. Daily Fleet)"
                          style={{ marginBottom: '4px' }}
                          value={stat.label || ''}
                          onChange={(e) => {
                            const updated = [...cmsSettings.heroStats];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setCmsSettings({ ...cmsSettings, heroStats: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Subtext (e.g. Scheduled Dispatches)"
                          value={stat.subtext || ''}
                          onChange={(e) => {
                            const updated = [...cmsSettings.heroStats];
                            updated[idx] = { ...updated[idx], subtext: e.target.value };
                            setCmsSettings({ ...cmsSettings, heroStats: updated });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD 3: Corporate Contact & Counter Details */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 700 }}>
                  Corporate Contact & Counter Details (Public Portal & Bill Receipts)
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Company / Service Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={cmsSettings.companyName || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Helpline / Counter Contact Phone <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={cmsSettings.companyPhone || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Official Support Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={cmsSettings.companyEmail || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GSTIN / Registration No. (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 36AAAAA0000A1Z5"
                      value={cmsSettings.gstin || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, gstin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Registered Branch / Physical Counter Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cmsSettings.companyAddress || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, companyAddress: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Consignment Receipt Footer Terms / Note</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={cmsSettings.receiptFooterNote || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, receiptFooterNote: e.target.value })}
                  />
                </div>
              </div>

              {/* Floating Save Action Bar */}
              <div
                style={{
                  position: 'sticky',
                  bottom: '1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.875rem 1.25rem',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  zIndex: 80,
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                  Changes will apply immediately across Public Home, Tracking, and Consignment Receipts.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetCmsDefaults}
                    disabled={cmsSaving || cmsLoading}
                  >
                    <RotateCcw size={16} />
                    <span>Reset Presets</span>
                  </button>

                  <button type="submit" className="btn btn-primary" disabled={cmsSaving || cmsLoading}>
                    <Save size={16} />
                    <span>{cmsSaving ? 'Saving Changes...' : 'Save All Website CMS Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Vendor Onboarding Inquiries & Leads Management */}
        {activeTab === 'inquiries' && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header / Summary Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Inquiries Received</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{inquiries.length}</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>New & Unread Leads</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {inquiries.filter((i) => i.status === 'New').length}
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>In Discussion / Onboarding</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {inquiries.filter((i) => ['Contacted', 'In Discussion'].includes(i.status)).length}
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Closed / Handled</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#64748b', marginTop: '2px' }}>
                  {inquiries.filter((i) => i.status === 'Closed').length}
                </div>
              </div>
            </div>

            {/* Filter & Action Bar */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter by Status:</span>
                {['ALL', 'New', 'Contacted', 'In Discussion', 'Closed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setInquiryStatusFilter(st)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: inquiryStatusFilter === st ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: inquiryStatusFilter === st ? '#eff6ff' : '#f8fafc',
                      color: inquiryStatusFilter === st ? '#1d4ed8' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchInquiries}
                disabled={inquiriesLoading}
              >
                <RefreshCw size={13} className={inquiriesLoading ? 'spin' : ''} />
                <span>Refresh Leads</span>
              </button>
            </div>

            {/* Inquiries Data Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {inquiriesLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
                  <div>Loading inquiries & leads...</div>
                </div>
              ) : inquiries.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <MessageSquare size={32} color="#cbd5e1" style={{ margin: '0 auto 0.75rem auto' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>No Inquiries Yet</h4>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>When commercial vendors submit inquiries on the public home page, they will appear here instantly.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Ref # / Date</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Vendor / Contact</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Phone & WhatsApp</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Inquiry Type</th>
                        <th style={{ padding: '0.75rem 1rem' }}>City / Route</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries
                        .filter((i) => inquiryStatusFilter === 'ALL' || i.status === inquiryStatusFilter)
                        .map((inq) => (
                          <tr key={inq._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <strong style={{ color: '#2563eb', display: 'block' }}>{inq.referenceNumber || 'INQ'}</strong>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {new Date(inq.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <strong style={{ color: '#0f172a' }}>{inq.name}</strong>
                              {inq.message && (
                                <div style={{ fontSize: '0.725rem', color: '#64748b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  "{inq.message}"
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <a href={`tel:${inq.phone}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                                {inq.phone}
                              </a>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ fontSize: '0.725rem', backgroundColor: '#f1f5f9', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                                {inq.inquiryType}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                              {inq.city || 'State-wide'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select
                                value={inq.status}
                                onChange={(e) => handleUpdateInquiryStatus(inq._id, e.target.value)}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: inq.status === 'New' ? '#ecfdf5' : '#ffffff',
                                  color: inq.status === 'New' ? '#047857' : '#0f172a',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="New">New Lead</option>
                                <option value="Contacted">Contacted</option>
                                <option value="In Discussion">In Discussion</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <a
                                href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `Hi ${inq.name}, regarding your inquiry (${inq.referenceNumber}) for ${inq.inquiryType} on our courier portal...`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: '0.725rem',
                                  padding: '0.25rem 0.6rem',
                                  color: '#059669',
                                  borderColor: '#a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  textDecoration: 'none',
                                }}
                              >
                                <MessageSquare size={13} color="#059669" />
                                <span>WhatsApp</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Standard Modals (Clean White Enterprise Design System) */}

      {/* Modal: Onboard New Courier Organization (Streamlined with Required Details Only) */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Onboard New Courier Business
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
                  Automated onboarding initializes an isolated tenancy, creates the tenant administrator account with a temporary password, and provisions default operational routes.
                </div>

                {/* 1. Organization Details */}
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">Organization Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Navata Road Transport"
                    value={formData.companyName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => {
                        const cleanWord = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const suggestedUsername = cleanWord ? `${cleanWord}_admin` : '';
                        return {
                          ...prev,
                          companyName: name,
                          adminUsername: (!prev.adminUsername || prev.adminUsername.endsWith('_admin')) ? suggestedUsername : prev.adminUsername,
                        };
                      });
                    }}
                    required
                  />
                </div>

                {/* Unique ID & Subscription Tier */}
                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Automated Unique ID <span className="required">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = generateUniqueTenantId(formData.companyName);
                          setFormData((prev) => ({ ...prev, uniqueId: newId, slug: newId.toLowerCase() }));
                          showToast(`Generated Unique ID: ${newId}`, 'info');
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        <Shuffle size={12} /> Regenerate
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. NV4829"
                        value={formData.uniqueId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                          setFormData({ ...formData, uniqueId: val, slug: val.toLowerCase() });
                        }}
                        maxLength={8}
                        style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                        required
                      />
                    </div>
                    <div className="form-hint">Unique 4-6 alphanumeric code for organization isolation</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subscription Tier <span className="required">*</span></label>
                    <select
                      className="form-control"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      required
                    >
                      <option value="BASIC">Basic (Single Branch)</option>
                      <option value="PRO">Pro (Multi-Branch Fleet)</option>
                      <option value="ENTERPRISE">Enterprise (Unlimited Buses & Hubs)</option>
                    </select>
                  </div>
                </div>

                {/* Official Mail & Phone */}
                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Official Mail (Email) <span className="required">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. contact@navata.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9848012345"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 2. Admin Login Credentials */}
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.5rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  Admin Login & Temporary Password
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admin Username <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. navata_admin"
                      value={formData.adminUsername}
                      onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      required
                    />
                    <div className="form-hint">Used by tenant admin to sign in to portal</div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Automated Temp Password <span className="required">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPass = generateTempPassword();
                          setFormData((prev) => ({ ...prev, adminPassword: newPass }));
                          showToast('Generated new temporary password', 'info');
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        <Shuffle size={12} /> Regenerate
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Temporary password"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        style={{ paddingRight: '65px', fontFamily: 'monospace', fontWeight: 600 }}
                        required
                      />
                      <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.adminPassword, 'tempPass')}
                          title="Copy temporary password"
                          style={{ background: 'none', border: 'none', color: copiedKey === 'tempPass' ? '#059669' : '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {copiedKey === 'tempPass' ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-hint">Admin must change password after first sign-in</div>
                  </div>
                </div>

                {/* 3. Operational Hub & Counter Address */}
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.5rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  Operational Hub & Counter Address
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primary Branch / Hub Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Central Hub / Counter 1"
                      value={formData.adminBranch || ''}
                      onChange={(e) => setFormData({ ...formData, adminBranch: e.target.value })}
                    />
                    <div className="form-hint">Displayed on operator topnav and parcel manifests</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Physical Office / Counter Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Platform 4, Central Bus Station, MG Road"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <div className="form-hint">Printed on customer receipts & delivery waybills</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Business & Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Onboarded Credentials Summary (Copy & Share) */}
      {createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#166534' }}>
                  Organization Onboarded Successfully
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setCreatedCredentials(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.75rem' }}>
                The courier business has been registered and isolated in the platform. An official welcome email with branded company banner and login credentials has been queued for dispatch.
              </p>

              {/* Email dispatch notice card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  color: '#065f46',
                  fontSize: '0.8125rem',
                }}
              >
                <Mail size={18} color="#059669" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Credentials Email Dispatched</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '2px', color: '#047857' }}>
                    Branded company banner and client credentials sent to <strong>{createdCredentials.email}</strong>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Organization:</span>
                  <strong style={{ color: '#0f172a' }}>{createdCredentials.companyName}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Unique Organization ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e3a5f', backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '3px' }}>
                    {createdCredentials.uniqueId}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Official Mail:</span>
                  <span style={{ color: '#0f172a' }}>{createdCredentials.email}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Phone Number:</span>
                  <span style={{ color: '#0f172a' }}>{createdCredentials.phone}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Subscription Tier:</span>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{createdCredentials.plan}</span>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b' }}>Admin Username:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>@{createdCredentials.username}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b' }}>Temporary Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        {createdCredentials.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(createdCredentials.password, 'credPass')}
                        style={{ background: 'none', border: 'none', color: copiedKey === 'credPass' ? '#059669' : '#64748b', cursor: 'pointer', padding: '3px' }}
                        title="Copy password"
                      >
                        {copiedKey === 'credPass' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const summary = `=== Courier Service Organization Credentials ===\nOrganization: ${createdCredentials.companyName}\nUnique ID: ${createdCredentials.uniqueId}\nAdmin Username: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}\nOfficial Email: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nSubscription Tier: ${createdCredentials.plan}\nPortal Login: ${window.location.origin}/#login`;
                    handleCopyText(summary, 'allCreds');
                  }}
                >
                  {copiedKey === 'allCreds' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'allCreds' ? 'Credentials Copied!' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSendCredentialsEmail(createdCredentials)}
                  disabled={emailSending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#1e40af', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
                  title="Resend welcome email with branded banner and credentials to client"
                >
                  <Mail size={14} />
                  <span>{emailSending ? 'Dispatching...' : 'Resend Email'}</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreatedCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permanent Delete Confirmation */}
      {deleteConfirmTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>
                  Permanently Delete Organization
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDeleteConfirmTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600, marginBottom: '0.75rem' }}>
                Are you sure you want to permanently delete "{deleteConfirmTenant.companyName}"?
              </p>
              <div style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8125rem', color: '#7f1d1d', lineHeight: '1.5' }}>
                <strong>Warning:</strong> This action cannot be undone. All data belonging to this organization will be permanently deleted from the database, including:
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li>Staff & Admin accounts</li>
                  <li>All Consignment Bookings & Order History</li>
                  <li>Bus Dispatches, Schedules, & Assigned Fleet</li>
                  <li>Destinations, Cities, & Rate Cards</li>
                  <li>Customer Directories & Settings</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirmTenant(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteTenant}
                disabled={isDeleting}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting Organization...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Tenant */}
      {editingTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Edit Organization: {editingTenant.companyName}
              </h3>
              <button className="modal-close-btn" onClick={() => setEditingTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTenant.companyName || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingTenant.contactPhone || ''}
                      onChange={(e) => setEditingTenant({ ...editingTenant, contactPhone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingTenant.contactEmail || ''}
                      onChange={(e) => setEditingTenant({ ...editingTenant, contactEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Subscription Plan</label>
                    <select
                      className="form-control"
                      value={editingTenant.plan || 'PRO'}
                      onChange={(e) => setEditingTenant({ ...editingTenant, plan: e.target.value })}
                    >
                      <option value="BASIC">Basic</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={editingTenant.status || 'ACTIVE'}
                      onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Office Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTenant.address || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingTenant(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Admin Password */}
      {resetPasswordTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Reset Admin Password
              </h3>
              <button className="modal-close-btn" onClick={() => setResetPasswordTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
                  Resetting credentials for administrator account of{' '}
                  <strong>{resetPasswordTenant.companyName}</strong> (username:{' '}
                  <code>{resetPasswordTenant.adminUser?.username || 'admin'}</code>).
                </p>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setResetPasswordTenant(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !newPassword}
                >
                  {isSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Configuration Modal (Super Admin Exclusive) */}
      {whatsappConfigTenant && (
        <WhatsAppConfigModal
          tenant={whatsappConfigTenant}
          isOpen={!!whatsappConfigTenant}
          onClose={() => setWhatsappConfigTenant(null)}
          onSaved={() => {
            fetchDashboardData();
            if (selectedTenantId) {
              fetchTenantOverview(selectedTenantId);
            }
          }}
        />
      )}
    </div>
  );
};
