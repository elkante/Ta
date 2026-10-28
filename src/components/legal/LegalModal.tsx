import React, { useState } from 'react';
import {
  Cookie,
  FileText,
  Printer,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

export type LegalTab = 'terms' | 'privacy' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm tracking-tighter">
              Tá
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {activeTab === 'terms'
                  ? 'Terms & Conditions'
                  : activeTab === 'privacy'
                  ? 'Privacy Policy'
                  : 'Cookie & Storage Policy'}
              </h3>
              <p className="text-xs text-slate-500">
                Official Tá.shop Platform Governance • Last Updated: October 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Print Policy"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 mx-6 mt-3 rounded-2xl text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'terms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'cookies'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cookie className="w-3.5 h-3.5 text-amber-600" />
            <span>Cookie Policy</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Summary:</strong> Tá.shop provides catalog management, Item UID discovery, and WhatsApp routing software for merchants. Customers browse and order login-free directly with merchants.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Acceptance of Terms</h4>
                <p className="text-slate-600">
                  By accessing or using the Tá.shop platform ("Service"), creating a storefront, or browsing merchant catalogs, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must discontinue using our services.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Nature of the Service</h4>
                <p className="text-slate-600">
                  Tá.shop is a multi-tenant software-as-a-service (SaaS) catalog platform designed to streamline social commerce across WhatsApp, Instagram, and other channels. Tá.shop provides:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li>Custom digital storefronts accessible via subdomains or web paths (e.g., <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">brand.ta.shop</code>).</li>
                  <li>Automated product cataloging, Item Unique Identifiers (Item UIDs), and barcode generator tools.</li>
                  <li>Pre-formatted 1-click WhatsApp order message routing.</li>
                  <li>Optional automated WhatsApp bot assistant tooling.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Merchant Accounts & Subscriptions</h4>
                <p className="text-slate-600">
                  Merchants may subscribe to Tá.shop plans:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li><strong>Starter Plan (₦500/month or ₦6,000/year):</strong> Core catalog features, WhatsApp order dispatch, and mobile management.</li>
                  <li><strong>Pro Plan (₦4,900/month or ₦47,040/year with 20% annual discount):</strong> Unlimited products, verified badge, removed Tá branding, custom domain support.</li>
                  <li><strong>Business AI Plan (₦25,000/month or ₦240,000/year with 20% annual discount):</strong> WhatsApp AI Customer Agent, automated inventory reconciliation, priority support.</li>
                </ul>
                <p className="mt-2 text-slate-600">
                  Subscriptions are processed through licensed payment gateways (such as Paystack). Subscriptions renew automatically unless cancelled before the renewal date. Refunds are provided only in cases of verified billing errors.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Merchant Obligations & Conduct</h4>
                <p className="text-slate-600">
                  Merchants are solely responsible for:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li>The accuracy of product pricing, descriptions, inventory, and images displayed on their storefront.</li>
                  <li>Fulfilling orders received via WhatsApp, dispatching packages, and providing accurate delivery terms to buyers.</li>
                  <li>Compliance with Nigerian commercial regulations (including Federal Competition and Consumer Protection Act, FCCPA) and local sales laws.</li>
                  <li>Maintaining the confidentiality of their merchant login credentials.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">5. Prohibited Products & Content</h4>
                <p className="text-slate-600">
                  You may not list, advertise, or sell:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li>Counterfeit currency, stolen goods, or fraudulent instruments.</li>
                  <li>Illegal narcotics, prescription medications without legal licensing, or hazardous substances.</li>
                  <li>Firearms, weapons, or explosives.</li>
                  <li>Hate speech, defamatory material, or non-consensual imagery.</li>
                </ul>
                <p className="mt-2 text-slate-600">
                  Tá.shop reserves the right to immediately suspend or ban any storefront that violates these guidelines.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">6. Buyer & Customer Relationship</h4>
                <p className="text-slate-600">
                  Tá.shop is not an auction house, retail merchant, or party to transactions made between buyers and sellers on WhatsApp. Payment transfers, delivery arrangements, returns, and warranties are agreed upon directly between the customer and the respective store owner.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">7. Limitation of Liability</h4>
                <p className="text-slate-600">
                  To the maximum extent permitted by applicable law, Tá.shop, its founders, and affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from store downtime, delivery disputes, or merchant conduct.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">8. Governing Law</h4>
                <p className="text-slate-600">
                  These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200/80 rounded-2xl flex items-start gap-2.5 text-indigo-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Privacy First:</strong> Customers browse login-free. We never sell your personal data or track customer purchases across unrelated websites.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Information We Collect</h4>
                <p className="text-slate-600">
                  We collect information necessary to provide and maintain our services:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li><strong>Merchant Account Data:</strong> Business name, email address, WhatsApp business number, store slug, encrypted password, and social media handles.</li>
                  <li><strong>Catalog Data:</strong> Product titles, descriptions, pricing, inventory stock counts, and uploaded product images.</li>
                  <li><strong>Customer Inquiry Data:</strong> When a shopper clicks "Order via WhatsApp" or types their delivery name and address in the instant checkout drawer, that information is packaged for delivery to the seller's WhatsApp.</li>
                  <li><strong>Technical Logs:</strong> IP address, device browser type, and anonymous performance logs to ensure system reliability and security.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Zero Customer Login Architecture</h4>
                <p className="text-slate-600">
                  Tá.shop is specifically built so shoppers do not need to register an account or create a password to browse, search products by Item UID, or submit inquiries. This minimizes customer data retention and eliminates credential exposure.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. How We Use Information</h4>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li>To generate and host merchant storefronts and Item UID catalogs.</li>
                  <li>To route orders and customer messages directly to merchant WhatsApp endpoints.</li>
                  <li>To process merchant subscription billings securely through licensed payment processors (Paystack).</li>
                  <li>To prevent platform fraud, protect system integrity, and enforce our acceptable use policies.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Data Storage & Security Standards</h4>
                <p className="text-slate-600">
                  All communications are encrypted in transit using Transport Layer Security (TLS 1.3/HTTPS). Data stored on Supabase is protected with PostgreSQL Row-Level Security (RLS) policies, strict role-based access, and salted password hashing via <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">pgcrypto</code>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">5. Compliance with NDPR</h4>
                <p className="text-slate-600">
                  Tá.shop complies with the Nigeria Data Protection Regulation (NDPR) and international privacy principles. Users retain the right to request access to their stored personal data, request corrections, or request complete deletion of their store and associated records.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">6. Contacting the Privacy Officer</h4>
                <p className="text-slate-600">
                  If you have inquiries regarding this Privacy Policy or wish to request data removal, please contact our team at <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-900">privacy@ta.shop</code>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
                <Cookie className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>No Ad Tracking:</strong> Tá.shop uses browser storage strictly for essential platform functionality, active seller sessions, and shopping cart persistence.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. What are Cookies and Local Storage?</h4>
                <p className="text-slate-600">
                  Cookies and local storage technologies are small text files or key-value data structures saved in your device's browser memory. They allow a web application to remember your preferences and maintain your session across page reloads.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. How Tá.shop Uses Storage Technologies</h4>
                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="font-bold text-slate-900 text-xs mb-1">Strictly Essential Storage (Always Active)</p>
                    <p className="text-slate-600 text-xs">
                      Required for the platform to function. Stores merchant login sessions, active store tenant selection, and customer shopping cart items before checkout.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="font-bold text-slate-900 text-xs mb-1">Functional & Preference Storage</p>
                    <p className="text-slate-600 text-xs">
                      Remembers UI settings such as currency selection, audio chime preferences for orders, and onboarding guide completion status.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="font-bold text-slate-900 text-xs mb-1">Payment Gateway Security Tokens</p>
                    <p className="text-slate-600 text-xs">
                      When upgrading subscriptions, our payment partner (Paystack) uses temporary secure tokens to verify transactions and prevent payment fraud.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Third-Party Advertising Policy</h4>
                <p className="text-slate-600">
                  Tá.shop does <strong>not</strong> partner with behavioral ad-tech brokers, cross-site trackers, or third-party data aggregators. We do not inject advertising cookies into your browser.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Managing Your Preferences</h4>
                <p className="text-slate-600">
                  You can control or clear cookies and local storage through your browser settings at any time (e.g. Chrome Settings $\rightarrow$ Privacy & Security $\rightarrow$ Clear Browsing Data). Note that clearing local storage will log out active seller sessions and reset local cart contents.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Tá.shop • Legally Compliant & NDPR Certified
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
