'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mic, ArrowLeft, Shield } from 'lucide-react';

const LAST_UPDATED = 'March 18, 2026';
const COMPANY = 'PalmCare AI';
const WEBSITE = 'palmcareai.com';
const SUPPORT_EMAIL = 'support@palmtai.com';
const PRIVACY_EMAIL = 'support@palmtai.com';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-dark-900 landing-dark">
      {/* Header */}
      <header className="border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
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
                <li><strong className="text-white">Business Information:</strong> Agency name, state of incorporation, business registration number, address, and licensing details.</li>
                <li><strong className="text-white">Client & Care Data:</strong> Client names, care assessments, caregiver information, visit records, and related care documentation that you input into the platform.</li>
                <li><strong className="text-white">Audio Recordings & Transcripts:</strong> Audio recordings of care assessments that you upload for AI-powered transcription, speaker identification, and documentation generation. See Section 4 for recording consent requirements.</li>
                <li><strong className="text-white">Assessment Data:</strong> Structured assessment information including ADLs, IADLs, cognitive screening results, medical conditions, and care needs as captured during provider assessments.</li>
                <li><strong className="text-white">Payment Information:</strong> Subscriptions are processed by Apple through In-App Purchase. We never receive or store your payment card details; Apple handles all payment information under its own privacy policy.</li>
                <li><strong className="text-white">Communications:</strong> Support tickets, emails, and other correspondence you send to us.</li>
              </ul>
            </Subsection>
            <Subsection title="Information Collected Automatically">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">Usage & Engagement Data:</strong> Pages visited, features used, timestamps, session duration, login frequency, and interaction patterns used for platform analytics and engagement scoring.</li>
                <li><strong className="text-white">Device Information:</strong> Browser type, operating system, IP address, device identifiers, screen resolution, and language preferences.</li>
                <li><strong className="text-white">Mobile Device Data:</strong> If you access the Service through a mobile application or mobile browser, we may collect your mobile device ID, push notification tokens, device model, mobile operating system version, and mobile carrier information.</li>
                <li><strong className="text-white">Microphone Access:</strong> The Service requests microphone permission solely for the purpose of recording care assessments. Microphone access is only activated when you explicitly initiate a recording session. We do not access your microphone in the background.</li>
                <li><strong className="text-white">Cookies:</strong> We use essential cookies for authentication and session management. See Section 8 for details.</li>
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
              <li><strong className="text-white">AI Processing Partners:</strong> Audio and transcript data may be processed by AI service providers (e.g., Deepgram for transcription, Anthropic Claude for analysis) for transcription and document generation. Data is transmitted securely and is not used to train third-party models.</li>
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

          <Section title="5. Audio Recording & Consent Disclosures">
            <p className="text-dark-300 mb-4">
              {COMPANY} processes audio recordings of care assessments to generate transcripts, visit notes, service contracts, and billable item documentation. Recording consent requirements vary by state.
            </p>
            <Subsection title="Two-Party (All-Party) Consent States">
              <p className="text-dark-300 mb-3">
                If you or your clients are located in any of the following states, <strong className="text-white">all parties must consent</strong> before any audio recording takes place:
              </p>
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-dark-300 text-sm">
                  <span>California</span>
                  <span>Connecticut</span>
                  <span>Delaware</span>
                  <span>Florida</span>
                  <span>Illinois</span>
                  <span>Maryland</span>
                  <span>Massachusetts</span>
                  <span>Michigan</span>
                  <span>Montana</span>
                  <span>New Hampshire</span>
                  <span>Oregon (in-person)</span>
                  <span>Pennsylvania</span>
                  <span>Washington</span>
                </div>
              </div>
              <p className="text-dark-300 text-sm">
                All other states follow one-party consent rules under federal law (18 U.S.C. &sect;2511), meaning at least one participant (typically the person recording) must consent.
              </p>
            </Subsection>
            <Subsection title="Your Consent Obligations">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">Provider Responsibility:</strong> As the agency using {COMPANY}, you are responsible for obtaining appropriate consent from clients and caregivers before recording assessments.</li>
                <li><strong className="text-white">Cross-State Calls:</strong> When participants are in different states, the stricter state&apos;s consent law applies. When in doubt, obtain consent from all parties.</li>
                <li><strong className="text-white">Consent Documentation:</strong> We recommend documenting consent in writing as part of your intake or service agreement process.</li>
                <li><strong className="text-white">Platform Support:</strong> {COMPANY} provides consent notification features to assist with compliance, but does not replace your legal obligation to obtain valid consent.</li>
              </ul>
            </Subsection>
            <Subsection title="How We Process Recordings">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">Transcription:</strong> Audio is converted to text using AI speech-to-text technology.</li>
                <li><strong className="text-white">Speaker Identification:</strong> AI identifies different speakers in the recording (provider vs. client).</li>
                <li><strong className="text-white">Documentation:</strong> Transcripts are analyzed to generate visit notes, extract billable services, and create service agreements.</li>
                <li><strong className="text-white">Storage:</strong> Recordings are encrypted at rest (AES-256) and in transit (TLS 1.2+). Audio is retained according to the schedule in Section 6.</li>
                <li><strong className="text-white">No Third-Party Training:</strong> Your audio recordings are never used to train third-party AI models.</li>
              </ul>
            </Subsection>
          </Section>

          <Section title="6. Data Retention">
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>Account data is retained for the duration of your active subscription and for 90 days following account closure.</li>
              <li>Audio recordings are retained for 30 days after processing, then permanently deleted unless you choose to retain them.</li>
              <li>Generated contracts, notes, and care documentation are retained for the life of your account.</li>
              <li>Audit logs are retained for a minimum of 6 years for compliance purposes.</li>
              <li>You may request deletion of your data at any time by contacting <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a>.</li>
            </ul>
          </Section>

          <Section title="7. Data Security">
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

          <Section title="8. Cookies & Tracking">
            <p className="text-dark-300 mb-4">We use the following types of cookies:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Essential Cookies:</strong> Required for authentication, session management, and security. These cannot be disabled.</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how users interact with the Service to improve the experience. These can be opted out of.</li>
            </ul>
            <p className="text-dark-300 mt-4">We do not use advertising cookies or sell data to advertisers.</p>
          </Section>

          <Section title="9. Your Rights">
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

          <Section title="10. California Privacy Rights (CCPA)">
            <p className="text-dark-300">If you are a California resident, you have the right to know what personal information we collect, request its deletion, and opt out of any sale of personal information. We do not sell personal information. To make a request, contact <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a>.</p>
          </Section>

          <Section title="11. Account & Data Deletion">
            <p className="text-dark-300 mb-4">You have the right to delete your account and all associated data at any time. We provide multiple ways to exercise this right:</p>
            <Subsection title="How to Delete Your Account">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li><strong className="text-white">In-App:</strong> Navigate to Settings &gt; Account &gt; Delete Account. This will initiate permanent deletion of your account and all associated data.</li>
                <li><strong className="text-white">By Email:</strong> Send a deletion request to <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary-400 hover:text-primary-300">{PRIVACY_EMAIL}</a> from the email address associated with your account.</li>
                <li><strong className="text-white">Via Web:</strong> Log in at {WEBSITE}, go to Settings, and select &quot;Delete Account.&quot;</li>
              </ul>
            </Subsection>
            <Subsection title="What Gets Deleted">
              <ul className="list-disc list-inside space-y-2 text-dark-300">
                <li>Your user profile, login credentials, and account settings</li>
                <li>All client records, assessments, care plans, and contracts you created</li>
                <li>Audio recordings and transcripts</li>
                <li>Subscription status and plan data (Apple retains purchase/transaction records per its policy)</li>
                <li>Push notification tokens and device registrations</li>
              </ul>
            </Subsection>
            <Subsection title="Deletion Timeline">
              <p className="text-dark-300">Account deletion is processed within 30 days of your request. Some data may be retained for up to 90 days in encrypted backups before permanent removal. Audit logs required by HIPAA or other legal obligations may be retained for up to 6 years as required by law, but will be disassociated from your personal identity.</p>
            </Subsection>
          </Section>

          <Section title="12. Sensitive Health Data & Consent">
            <p className="text-dark-300 mb-4">The Service processes sensitive health-related data including patient assessments, medical conditions, care needs, and clinical documentation. We handle this data with the highest standard of care:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Explicit Consent:</strong> By using the Service to input or record health data, you confirm that you have obtained all necessary consents from the individuals whose health information is being processed.</li>
              <li><strong className="text-white">Purpose Limitation:</strong> Health data is processed solely for the purpose of generating care documentation, assessments, contracts, and billing records as part of the Service. It is never used for advertising, marketing, or profiling purposes.</li>
              <li><strong className="text-white">No Sale of Health Data:</strong> We never sell, rent, or trade health data to any third party for any purpose.</li>
              <li><strong className="text-white">AI Processing:</strong> Health data processed by AI systems (transcription, document generation) is handled in accordance with Section 4 (HIPAA) and Section 5 (Audio Recording) of this policy. AI outputs are tools to assist healthcare professionals and do not constitute medical advice.</li>
              <li><strong className="text-white">Minimum Necessary:</strong> We only collect and process the minimum amount of health data necessary to provide the specific Service features you use.</li>
            </ul>
          </Section>

          <Section title="13. Third-Party Services & SDKs">
            <p className="text-dark-300 mb-4">The Service integrates with the following third-party services. Each processes data according to their own privacy policies:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Deepgram (Speech-to-Text):</strong> Processes audio recordings for transcription. Audio is transmitted securely and is not retained by Deepgram after processing. <a href="https://deepgram.com/privacy" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Deepgram Privacy Policy</a></li>
              <li><strong className="text-white">Anthropic (AI Analysis):</strong> Processes transcript text for document generation (care plans, contracts, billable items). Data is not used to train Anthropic&apos;s models. <a href="https://www.anthropic.com/privacy" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
              <li><strong className="text-white">Apple (Payments):</strong> Processes subscription payments via In-App Purchase. We do not receive or store your payment card details. <a href="https://www.apple.com/legal/privacy/" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Apple Privacy Policy</a></li>
              <li><strong className="text-white">Resend (Email):</strong> Delivers transactional and service emails on our behalf. <a href="https://resend.com/legal/privacy-policy" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Resend Privacy Policy</a></li>
              <li><strong className="text-white">Railway (Hosting):</strong> Hosts our API infrastructure. All data is encrypted in transit and at rest. <a href="https://railway.app/legal/privacy" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Railway Privacy Policy</a></li>
              <li><strong className="text-white">Google (Calendar, OAuth):</strong> Optional integration for demo scheduling and calendar sync. Only activated when you explicitly connect your Google account. <a href="https://policies.google.com/privacy" className="text-primary-400 hover:text-primary-300" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
            </ul>
            <p className="text-dark-300 mt-4">We vet all third-party service providers for appropriate security and privacy practices. We do not permit any third-party SDK or service to collect data from our users for advertising or unrelated purposes.</p>
          </Section>

          <Section title="14. AI-Generated Content Disclaimer">
            <p className="text-dark-300 mb-4">The Service uses artificial intelligence to generate documents including care plans, clinical notes, service contracts, and billable item summaries. Please be aware of the following:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Assistance Tool:</strong> AI-generated content is intended as a professional assistance tool, not a replacement for clinical judgment, legal advice, or medical decision-making.</li>
              <li><strong className="text-white">Review Required:</strong> All AI-generated documents should be reviewed by a qualified professional before use. You are responsible for verifying the accuracy and appropriateness of generated content.</li>
              <li><strong className="text-white">No Guarantees:</strong> While we strive for accuracy, AI-generated content may contain errors or omissions. {COMPANY} is not liable for decisions made based on AI-generated output.</li>
              <li><strong className="text-white">Transparency:</strong> Documents generated by AI are clearly identified as such within the Service.</li>
            </ul>
          </Section>

          <Section title="15. International Data Transfers">
            <p className="text-dark-300">The Service is operated from the United States. If you access the Service from outside the United States, your information may be transferred to, stored, and processed in the United States where our servers are located and our central database is operated. By using the Service, you consent to the transfer of your information to the United States. We ensure that any international data transfers are conducted with appropriate safeguards in compliance with applicable data protection laws.</p>
          </Section>

          <Section title="16. Permissions We Request">
            <p className="text-dark-300 mb-4">The Service may request the following device permissions. Each permission is used solely for its stated purpose and can be revoked at any time through your device settings:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-white">Microphone:</strong> Required for recording care assessments via voice. Only active during explicit recording sessions initiated by you.</li>
              <li><strong className="text-white">Camera:</strong> Optional. Used for document scanning or profile photo capture if you choose to use these features.</li>
              <li><strong className="text-white">Notifications:</strong> Optional. Used to send reminders, task alerts, and team messages. Can be disabled in settings.</li>
              <li><strong className="text-white">Internet Access:</strong> Required for core functionality including data sync, AI processing, and real-time collaboration.</li>
              <li><strong className="text-white">Storage:</strong> Used for caching data offline and storing downloaded reports or exported documents.</li>
            </ul>
          </Section>

          <Section title="17. Children&apos;s Privacy">
            <p className="text-dark-300">The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child under 18, we will promptly delete it.</p>
          </Section>

          <Section title="18. Third-Party Links">
            <p className="text-dark-300">The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.</p>
          </Section>

          <Section title="19. Changes to This Policy">
            <p className="text-dark-300">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a new &quot;Last updated&quot; date. For significant changes, we will also send a notification to the email associated with your account.</p>
          </Section>

          <Section title="20. Contact Us">
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
          <p className="text-dark-400 text-sm">&copy; 2026 {COMPANY}. All rights reserved.</p>
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
