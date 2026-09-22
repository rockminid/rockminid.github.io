import React from 'react';
import { APP_VERSION } from '../version';
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
  Trash2,
} from 'lucide-react';

/**
 * Privacy policy.
 *
 * Written to describe what this deployment actually does, which is a narrower
 * and duller thing than the previous version claimed. Specifically:
 *
 *  - The earlier text carried an unqualified "GDPR & CCPA Compliant" badge
 *    while stating no controller, no lawful basis, no retention period and no
 *    erasure route. A compliance claim without those is a liability, not a
 *    reassurance.
 *  - It described AI interpretation as flowing "via a secure server-side API
 *    proxy". The public deployment has no backend at all, so that described a
 *    feature that does not run.
 *  - It called Firestore rules "Zero-Trust Attribute-Based Access Control
 *    (ABAC)", which is marketing vocabulary for per-document owner checks.
 *  - It did not mention that feedback is stored with your email address and
 *    cannot be read back or deleted by you.
 *
 * If you fork or redeploy this application with different services wired up,
 * this file must be updated to match.
 */

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="space-y-1.5">
    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    <div className="text-stone-400 space-y-1.5">{children}</div>
  </section>
);

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
    >
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-stone-100 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-title" className="text-base sm:text-lg font-bold text-stone-100">
                Privacy Policy
              </h2>
              <p className="text-xs text-stone-400">
                RockMin ID — what is processed, where it goes, and how to remove it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close privacy policy"
            className="p-1.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-stone-300 space-y-5 leading-relaxed">
          {/* Summary */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                <span className="font-semibold text-emerald-100">The short version:</span> your
                geochemical data is processed in your browser and is not sent anywhere. There are
                no analytics, no advertising trackers and no third-party scripts of any kind.
              </div>
              <div className="text-emerald-300/90">
                Data leaves your device only if you sign in and sync a collection, or if you
                submit feedback. Both are opt-in, and both are described below.
              </div>
            </div>
          </div>

          <Section
            icon={<Database className="w-4 h-4 text-amber-400" />}
            title="1. What is processed, and where"
          >
            <p>
              <strong className="text-stone-200">Geochemical inputs stay local.</strong> Oxide and
              element weight percentages, the CIPW norm, TAS and ternary coordinates, mineral
              matching and every index are computed entirely inside your browser. No composition
              you type is transmitted to any server by the classification engine. This remains true
              offline.
            </p>
            <p>
              <strong className="text-stone-200">Saved specimens.</strong> Samples you explicitly
              save are written to this browser&apos;s local storage. If you sign in, they are also
              copied to Google Cloud Firestore under your account so they appear on your other
              devices.
            </p>
            <p>
              <strong className="text-stone-200">Account details.</strong> Signing in with Google
              stores your account identifier, email address, display name and avatar URL, so a
              synced collection can be attached to you. Sign-in is handled by Google; this
              application never sees your password.
            </p>
            <p>
              <strong className="text-stone-200">Feedback.</strong> If you submit feedback, the
              category, rating, message, the optional sample context you attach and — when you are
              signed in — your email address are stored so the report can be followed up.
            </p>
            <p>
              <strong className="text-stone-200">
                No analytics, no cookies for tracking.
              </strong>{' '}
              This application loads no analytics SDK, no advertising pixel and no third-party
              fonts or scripts. The storage it does use is functional: your preferences, your local
              collection, the offline cache, and — only when signed in — Firebase&apos;s own
              authentication tokens.
            </p>
          </Section>

          <Section
            icon={<Server className="w-4 h-4 text-sky-400" />}
            title="2. Who processes it, and where it is held"
          >
            <p>
              The data controller is <strong className="text-stone-200">Kishan Tiwari</strong>,
              contactable at the address in section 7. This is an independent academic project,
              not a company.
            </p>
            <p>
              Cloud storage and authentication are provided by{' '}
              <strong className="text-stone-200">Google (Firebase Authentication and Cloud
              Firestore)</strong>, acting as a processor. Data held there may be stored and
              processed outside your country, including in the United States, under Google&apos;s
              terms for those services.
            </p>
            <p>
              The application itself is served as static files from GitHub Pages. GitHub receives
              the ordinary request information any web server does, such as your IP address, as
              described in GitHub&apos;s own privacy statement.
            </p>
            <p>
              <strong className="text-stone-200">Access control.</strong> Firestore security rules
              restrict each saved specimen to the account that created it: only the owning account
              can read, write or delete it. Feedback documents can be created by anyone but cannot
              be read back through the application by anyone, including their author.
            </p>
            <p>Traffic to and from all of these services uses HTTPS.</p>
          </Section>

          <Section
            icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
            title="3. Why it is processed, and for how long"
          >
            <p>
              <strong className="text-stone-200">Basis.</strong> Everything beyond local
              computation happens because you asked for it — by signing in, by saving a specimen,
              or by sending feedback. Where the UK/EU GDPR applies, that is consent, which you can
              withdraw at any time by deleting the data and signing out.
            </p>
            <p>
              <strong className="text-stone-200">Retention.</strong> Local data stays in your
              browser until you delete it or clear site data. Synced specimens and your account
              record stay until you delete them or ask for the account to be removed. Feedback is
              kept while the report is still useful for fixing the thing it reports, and is
              reviewed periodically.
            </p>
          </Section>

          <Section
            icon={<Trash2 className="w-4 h-4 text-rose-400" />}
            title="4. Your rights, and how to exercise them"
          >
            <p>
              You can see, export and delete your data from inside the application, without asking
              anyone:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-stone-200">Export</strong> any sample, batch or collection
                as CSV or JSON, and any diagram as SVG or PNG, at any time.
              </li>
              <li>
                <strong className="text-stone-200">Delete</strong> individual specimens from the
                Collection tab. Deleting while signed in removes the cloud copy too.
              </li>
              <li>
                <strong className="text-stone-200">Clear everything local</strong> by clearing site
                data for this site in your browser settings.
              </li>
              <li>
                <strong className="text-stone-200">Sign out</strong> to stop synchronisation.
              </li>
            </ul>
            <p>
              For anything that cannot be done in-app — deleting your account record entirely,
              obtaining a copy of everything held about you, correcting it, objecting to
              processing, or withdrawing a feedback submission — email the address in section 7
              and it will be actioned. Depending on where you live you may also have the right to
              complain to a data protection authority.
            </p>
            <p className="text-stone-500">
              One honest limitation: feedback is write-only by design, so it cannot be retrieved or
              removed from within the app. If you want a submission deleted, email and quote
              roughly when you sent it.
            </p>
          </Section>

          <Section
            icon={<EyeOff className="w-4 h-4 text-purple-400" />}
            title="5. AI interpretation"
          >
            <p>
              RockMin ID can optionally send already-computed results to Google Gemini to produce a
              written interpretation. <strong className="text-stone-200">This is switched off in
              the public deployment at rockminid.github.io</strong>, which has no backend: the
              narrative you see there is generated by a deterministic rule engine running in your
              browser.
            </p>
            <p>
              If you run your own instance with an AI backend configured, the sample name, the
              normalised oxide values, the leading candidate names and the norm are sent to that
              backend and on to Google. No API key is ever placed in the browser. Nothing about
              classification changes either way: the AI narrates numbers the deterministic engine
              has already produced and never alters them.
            </p>
          </Section>

          <Section
            icon={<Download className="w-4 h-4 text-amber-400" />}
            title="6. Reference data and external links"
          >
            <p>
              Reference compositions derived from GEOROC are bundled with the application and
              downloaded from this site. Querying them tells no one what you searched for.
            </p>
            <p>
              Links to Mindat, Webmineral, RRUFF, EarthChem/PetDB and GEOROC are ordinary
              hyperlinks. Following one takes you to that site under its own privacy policy; no
              session information is passed along.
            </p>
          </Section>

          <Section icon={<Mail className="w-4 h-4 text-amber-400" />} title="7. Contact">
            <p>
              For privacy questions, data requests, or academic collaboration:
            </p>
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-stone-200 font-semibold">Kishan Tiwari</div>
                <div className="text-amber-400 font-mono break-all">kishantiwari.geo@gmail.com</div>
              </div>
              <a
                href="mailto:kishantiwari.geo@gmail.com?subject=RockMin%20ID%20Privacy%20Inquiry"
                className="px-3 py-2 min-h-11 flex items-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                Send Email
              </a>
            </div>
          </Section>

          <Section
            icon={<ShieldCheck className="w-4 h-4 text-stone-400" />}
            title="8. Changes to this policy"
          >
            <p>
              If what the application does with data changes, this page changes with it and the
              date below is updated. Material changes will also be noted in the release notes for
              the version that introduces them.
            </p>
          </Section>

          <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-800">
            Last updated: 22 September 2026 · applies to RockMin ID v{APP_VERSION} as
            deployed at rockminid.github.io
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 min-h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
