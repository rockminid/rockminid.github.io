import React from 'react';
import {
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  EyeOff,
  Server,
  Download,
  Mail,
  X,
  FileText,
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-stone-100 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                Privacy Policy &amp; Data Security
              </h2>
              <p className="text-xs text-stone-400">
                RockMin ID — Geochemical &amp; Petrological Analysis Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-stone-300 space-y-5 leading-relaxed">
          {/* Quick Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-100">Scientific Integrity &amp; Privacy First:</span>{' '}
              RockMin ID does not sell your scientific research, EPMA microprobe assays, or whole-rock geochemical data. We do not use third-party advertising trackers or invasive analytics.
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              1. Information We Collect &amp; Process
            </h3>
            <p className="text-stone-400">
              Depending on how you utilize RockMin ID, we process the following data:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>
                <strong className="text-stone-200">Geochemical Inputs:</strong> Major oxide wt% (SiO2, TiO2, Al2O3, FeO/Fe2O3, MnO, MgO, CaO, Na2O, K2O, P2O5, LOI), trace element concentrations, and stoichiometric cation parameters. By default, mathematical classifications (TAS, ternary coordinates, CIPW norm) execute client-side inside your browser engine.
              </li>
              <li>
                <strong className="text-stone-200">User Account Details:</strong> If you choose to sign in via Google Identity Authentication, we store your user UID, email address, display name, and avatar URL to associate and sync your private geochemical collection.
              </li>
              <li>
                <strong className="text-stone-200">Saved Geological Specimens:</strong> Custom sample names, notes, classifications, and petrographic parameters you explicitly save to your collection.
              </li>
              <li>
                <strong className="text-stone-200">Feedback Submissions:</strong> User ratings, messages, and optional contact email addresses submitted through our in-app feedback system.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              2. How Your Data is Stored &amp; Protected
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>
                <strong className="text-stone-200">Zero-Trust Access Control:</strong> User-saved collections are stored in Google Cloud Firestore protected by Zero-Trust Attribute-Based Access Control (ABAC) rules. Only the authenticated owner UID can read, write, or delete their personal saved specimens.
              </li>
              <li>
                <strong className="text-stone-200">Local Browser Storage:</strong> For guest/anonymous use, all data is retained within your local browser storage (<code className="text-stone-300">localStorage</code> / IndexedDB). Clearing your browser cache permanently removes this local data.
              </li>
              <li>
                <strong className="text-stone-200">Encryption in Transit:</strong> All data transmissions between your browser and our backend services utilize TLS/HTTPS encryption.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-purple-400" />
              3. Artificial Intelligence &amp; Third-Party Services
            </h3>
            <p className="text-stone-400">
              When requesting petrogenetic interpretations via Google Gemini, geochemical oxide totals and algorithm classifications are sent via a secure server-side API proxy. No API keys or private credentials are exposed to the client.
            </p>
            <p className="text-stone-400">
              Reference databases (GEOROC, EarthChem, USGS, Mindat, Webmineral, RRUFF) linked within the app are open scientific references accessed through direct hyperlinks without sharing user session credentials.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              4. Data Export, Portability &amp; Deletion
            </h3>
            <p className="text-stone-400">
              You retain full ownership of your geochemical data. You can:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-400">
              <li>Export any single sample or batch dataset as CSV, JSON, or high-resolution vector SVG/PNG diagrams at any time.</li>
              <li>Delete individual saved specimens from your cloud or local collection with instant synchronization.</li>
              <li>Sign out to sever cloud synchronization at any moment.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              5. Contact &amp; Compliance Inquiries
            </h3>
            <p className="text-stone-400">
              For questions regarding this privacy policy, data privacy requests, or academic collaboration inquiries, please contact:
            </p>
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-stone-200 font-semibold">Lead Developer &amp; Petrology Lead</div>
                <div className="text-amber-400 font-mono">kishantiwari.geo@gmail.com</div>
              </div>
              <a
                href="mailto:kishantiwari.geo@gmail.com?subject=RockMin%20ID%20Privacy%20Inquiry"
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                Send Email
              </a>
            </div>
          </section>

          <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-800 flex items-center justify-between">
            <span>Last Updated: September 2026 (v2.4 LTS)</span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> GDPR &amp; CCPA Compliant
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
