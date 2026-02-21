'use client';

import Link from 'next/link';
import { Mic, ArrowLeft, Shield } from 'lucide-react';

const LAST_UPDATED = 'February 21, 2026';
const COMPANY = 'PalmCare AI';
const WEBSITE = 'palmcareai.com';
const SUPPORT_EMAIL = 'support@palmtai.com';
const PRIVACY_EMAIL = 'support@palmtai.com';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700/50 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">{COMPANY}</span>
          </Link>
          <Link href="/" className="text-dark-300 hover:text-white transition flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
              <p className="text-dark-400 text-sm">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <p className="text-dark-300 leading-relaxed">
            {COMPANY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy and security of your personal information. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our platform at {WEBSITE} and any related services (collectively, the &quot;Service&quot;).
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          <Section title="1. Information We Collect">
            <Subsection title="Information You Provide">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">Account Information:</strong> Name, email address, phone number, company/agency name, and password when you register for an account.</li>
                <li><strong className="text-white">Client & Care Data:</strong> Client names, care assessments, caregiver information, visit records, and related care documentation that you input into the platform.</li>
                <li><strong className="text-white">Audio & Transcripts:</strong> Audio recordings and transcripts of care assessments that you upload for AI processing.</li>
                <li><strong className="text-white">Payment Information:</strong> Billing details processed securely through our third-party payment processor (Stripe). We do not store full credit card numbers on our servers.</li>
                <li><strong className="text-white">Communications:</strong> Support tickets, emails, and other correspondence you send to us.</li>
              </ul>
            </Subsection>
            <Subsection title="Information Collected Automatically">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">Usage Data:</strong> Pages visited, features used, timestamps, session duration, and interaction patterns.</li>
                <li><strong className="text-white">Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
                <li><strong className="text-white">Cookies:</strong> We use essential cookies for authentication and session management. See Section 7 for details.</li>
              </ul>
            </Subsection>
          </Section>

          <Section title="2. How We Use Your Information">
            <p className="text-dark-300 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>Provide, operate, and maintain the Service, including AI-powered transcription, contract generation, and care documentation.</li>
              <li>Process your transactions and manage your subscription.</li>
              <li>Send transactional emails (account verification, password resets, billing receipts).</li>
              <li>Provide customer support and respond to your inquiries.</li>
              <li>Improve and personalize the Service through usage analytics.</li>
              <li>Detect, prevent, and address security issues and fraudulent activity.</li>
              <li>Comply with legal obligations, including healthcare data regulations.</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing & Disclosure">
            <p className="text-dark-300 mb-4">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Service Providers:</strong> Third-party vendors who assist in operating the Service (e.g., cloud hosting, payment processing, email delivery). These providers are contractually obligated to protect your data.</li>
              <li><strong className="text-white">AI Processing Partners:</strong> Audio and transcript data may be processed by AI service providers (e.g., OpenAI) for transcription and analysis. Data is transmitted securely and is not used to train third-party models.</li>
              <li><strong className="text-white">Legal Requirements:</strong> When required by law, subpoena, or government request, or to protect our rights, safety, or property.</li>
              <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to affected users.</li>
            </ul>
          </Section>

          <Section title="4. Healthcare Data & HIPAA">
            <p className="text-dark-300 mb-4">We recognize that the Service may be used to process Protected Health Information (PHI) as defined under the Health Insurance Portability and Accountability Act (HIPAA). We implement the following safeguards:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Encryption:</strong> All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
              <li><strong className="text-white">Access Controls:</strong> Role-based access with secure authentication, session timeouts, and audit logging.</li>
              <li><strong className="text-white">Data Isolation:</strong> Each agency&apos;s data is logically isolated and inaccessible to other customers.</li>
              <li><strong className="text-white">Audit Trails:</strong> All access to sensitive data is logged for compliance and security purposes.</li>
              <li><strong className="text-white">Business Associate Agreements:</strong> We will enter into a BAA with covered entities upon request. Contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary-400 hover:text-primary-300">{SUPPORT_EMAIL}</a> to arrange this.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>Account data is retained for the duration of your active subscription and for 90 days following account closure.</li>
              <li>Audio recordings are retained for 30 days after processing, then permanently deleted unless you choose to retain them.</li>
              <li>Generated contracts, notes, and care documentation are retained for the life of your account.</li>
              <li>Audit logs are retained for a minimum of 6 years for compliance purposes.</li>
              <li>You may request deletion of your data at any time by contacting <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a>.</li>
            </ul>
          </Section>

          <Section title="6. Data Security">
            <p className="text-dark-300 mb-4">We implement industry-standard technical and organizational measures to protect your data, including:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>256-bit AES encryption for data at rest</li>
              <li>TLS 1.2+ encryption for data in transit</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security assessments and vulnerability scanning</li>
              <li>Multi-factor authentication support</li>
              <li>Automatic session timeouts after periods of inactivity</li>
            </ul>
            <p className="text-dark-300 mt-4">While we strive to protect your information, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.</p>
          </Section>

          <Section title="7. Cookies & Tracking">
            <p className="text-dark-300 mb-4">We use the following types of cookies:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Essential Cookies:</strong> Required for authentication, session management, and security. These cannot be disabled.</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how users interact with the Service to improve the experience. These can be opted out of.</li>
            </ul>
            <p className="text-dark-300 mt-4">We do not use advertising cookies or sell data to advertisers.</p>
          </Section>

          <Section title="8. Your Rights">
            <p className="text-dark-300 mb-4">Depending on your jurisdiction, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
              <li><strong className="text-white">Portability:</strong> Request a machine-readable export of your data.</li>
              <li><strong className="text-white">Opt-Out:</strong> Unsubscribe from marketing emails at any time using the link in any email.</li>
            </ul>
            <p className="text-dark-300 mt-4">To exercise any of these rights, contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="9. California Privacy Rights (CCPA)">
            <p className="text-dark-300">If you are a California resident, you have the right to know what personal information we collect, request its deletion, and opt out of any sale of personal information. We do not sell personal information. To make a request, contact <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a>.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p className="text-dark-300">The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child under 18, we will promptly delete it.</p>
          </Section>

          <Section title="11. Third-Party Links">
            <p className="text-dark-300">The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.</p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p className="text-dark-300">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a new &quot;Last updated&quot; date. For significant changes, we will also send a notification to the email associated with your account.</p>
          </Section>

          <Section title="13. Contact Us">
            <p className="text-dark-300 mb-4">If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-5 space-y-2">
              <p className="text-white font-medium">{COMPANY}</p>
              <p className="text-dark-300">Email: <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a></p>
              <p className="text-dark-300">Website: <a href={`https://${WEBSITE}`} className="text-primary-400 hover:text-primary-300">{WEBSITE}</a></p>
            </div>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 py-8 px-6 mt-16">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>HIPAA-Ready Security</span>
            <span className="mx-2">&middot;</span>
            <span>256-bit Encryption</span>
          </div>
          <p className="text-dark-500 text-sm">&copy; 2026 {COMPANY}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-dark-200 mb-2">{title}</h3>
      {children}
    </div>
  );
}
