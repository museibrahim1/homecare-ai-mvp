'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mic, Shield, Lock } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-900 landing-dark">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-dark-300 hover:text-white transition">Home</Link>
            <Link href="/privacy" className="text-dark-300 hover:text-white transition">Privacy</Link>
            <Link href="/login" className="text-dark-300 hover:text-white transition">Sign In</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-dark-400 mb-12">Last updated: March 18, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            {[
              {
                title: '1. Acceptance of Terms',
                content: 'By accessing or using PalmCare AI ("Service"), including through any mobile application, web browser, or API, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the Service. The Service is operated by Palm Technologies, Inc. ("Company"), accessible at palmcareai.com and palmtai.com.',
              },
              {
                title: '2. Description of Service',
                content: 'PalmCare AI provides an AI-powered home care management platform including voice-powered care assessments, automated contract generation, client management (CRM), billing extraction, caregiver mobile tools, team messaging, and related services. The Service uses artificial intelligence to transcribe audio recordings, generate care documentation, and assist with agency operations. The Service is designed for use by home care agencies, their staff, and authorized caregivers.',
              },
              {
                title: '3. User Accounts',
                content: 'You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use. Accounts must be registered by persons 18 years of age or older. You may not create accounts on behalf of others without their consent. You may not share account credentials with unauthorized individuals.',
              },
              {
                title: '4. Free Trial, Subscription & Billing',
                content: 'New accounts receive a 7-day free trial with full access to all features. At the end of the trial period, your account will require an active subscription to continue using the Service. You will not be charged automatically at the end of the trial unless you explicitly subscribe to a paid plan. Paid plans are billed monthly or annually through Stripe. You may cancel your subscription at any time through Settings > Billing. Cancellation takes effect at the end of the current billing period. Prices are subject to change with 30 days written notice.',
              },
              {
                title: '5. Refund Policy',
                content: 'If you are unsatisfied with the Service, you may request a refund within 14 days of your initial purchase or most recent renewal. Refund requests should be sent to support@palmtai.com. Refunds are processed within 10 business days to the original payment method. Partial-month refunds are not available for monthly subscriptions cancelled mid-cycle. Free trial periods are not eligible for refunds.',
              },
              {
                title: '6. Data Privacy & HIPAA',
                content: 'We take data privacy seriously. All protected health information (PHI) is handled in compliance with HIPAA regulations. We offer Business Associate Agreements (BAAs) for all paying customers upon request. See our Privacy Policy at palmcareai.com/privacy for full details on data collection, use, protection, and your rights including account and data deletion.',
              },
              {
                title: '7. AI-Generated Content',
                content: 'The Service uses artificial intelligence to generate care plans, clinical notes, service contracts, and billable item documentation from audio recordings and assessment data. AI-generated content is provided as a professional assistance tool only. It does not constitute medical advice, legal advice, or a substitute for professional clinical judgment. You are solely responsible for reviewing, verifying, and approving all AI-generated documents before use. The Company is not liable for errors, omissions, or inaccuracies in AI-generated output. AI-generated documents are clearly labeled within the Service.',
              },
              {
                title: '8. User-Generated Content',
                content: 'You may create, upload, or input content into the Service including client records, notes, assessments, audio recordings, and team messages ("User Content"). You retain ownership of your User Content. By using the Service, you grant the Company a limited, non-exclusive license to process, store, and display your User Content solely for the purpose of providing the Service. You are responsible for ensuring that your User Content does not violate any laws, contain harmful or malicious material, infringe on third-party rights, or include content that is defamatory, obscene, or threatening. The Company reserves the right to remove User Content that violates these terms.',
              },
              {
                title: '9. Acceptable Use',
                content: 'You agree to use the Service only for lawful purposes related to home care agency operations. You may not: (a) reverse-engineer, decompile, or disassemble the Service; (b) use the Service to store or transmit malicious code, viruses, or harmful content; (c) attempt unauthorized access to any part of the Service or its infrastructure; (d) resell, sublicense, or redistribute access without written authorization; (e) use the AI features to generate misleading, fraudulent, or harmful documents; (f) scrape, crawl, or extract data from the Service through automated means; (g) use the Service to harass, threaten, or harm any individual; or (h) use the Service in any manner that violates applicable healthcare laws or regulations.',
              },
              {
                title: '10. Intellectual Property',
                content: 'The Service, including its software, design, logos, trademarks, and proprietary content, is the property of Palm Technologies, Inc. and protected by intellectual property laws. Your data (client records, contracts, templates, audio recordings) remains your property. You grant us a limited, revocable license to process your data solely to provide the Service. You may not use the PalmCare AI name, logo, or branding without written permission.',
              },
              {
                title: '11. Account Deletion & Data Export',
                content: 'You may delete your account at any time through Settings > Account > Delete Account, or by emailing support@palmtai.com. Upon account deletion: (a) your subscription will be cancelled immediately; (b) you will have 30 days to export your data before permanent deletion; (c) all client records, assessments, contracts, audio recordings, and personal data will be permanently deleted within 90 days; (d) audit logs required by law may be retained for up to 6 years but will be disassociated from your identity. We also honor deletion requests received through app store review processes.',
              },
              {
                title: '12. Service Availability',
                content: 'We target 99.9% uptime but do not guarantee uninterrupted availability. Scheduled maintenance will be communicated in advance when possible. Our status page at palmcareai.com/status provides real-time system information. We are not liable for service interruptions caused by factors beyond our control including internet outages, natural disasters, or third-party service failures.',
              },
              {
                title: '13. Indemnification',
                content: 'You agree to indemnify, defend, and hold harmless Palm Technologies, Inc., its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; (d) any User Content you create or upload; or (e) your failure to obtain proper consents for audio recordings or health data processing.',
              },
              {
                title: '14. Limitation of Liability',
                content: 'To the maximum extent permitted by law, Palm Technologies, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill. Our total aggregate liability for any claims arising from or related to the Service shall not exceed the total fees paid by you in the 12 months immediately preceding the event giving rise to the claim. This limitation applies regardless of the form of action, whether in contract, tort, strict liability, or otherwise.',
              },
              {
                title: '15. Disclaimer of Warranties',
                content: 'The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure. AI-generated content is provided without warranty of accuracy or completeness. The Service does not provide medical, legal, or financial advice.',
              },
              {
                title: '16. Dispute Resolution',
                content: 'Any dispute arising from or relating to these Terms or the Service shall first be addressed through good-faith negotiation between the parties for a period of 30 days. If the dispute cannot be resolved through negotiation, it shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The arbitration shall take place in Omaha, Nebraska. Each party shall bear its own costs. Nothing in this section prevents either party from seeking injunctive relief in a court of competent jurisdiction for the protection of intellectual property rights or confidential information.',
              },
              {
                title: '17. Governing Law',
                content: 'These Terms shall be governed by and construed in accordance with the laws of the State of Nebraska, without regard to its conflict of law provisions. You consent to the exclusive jurisdiction of the state and federal courts located in Douglas County, Nebraska for any legal proceedings not subject to arbitration.',
              },
              {
                title: '18. Termination',
                content: 'Either party may terminate the subscription at any time. Upon termination, you retain the right to export your data for 30 days. We may suspend or terminate accounts that violate these Terms, are used for fraudulent purposes, or pose a security risk to the Service or other users. We will provide reasonable notice before termination except in cases of severe or urgent violations.',
              },
              {
                title: '19. Changes to Terms',
                content: 'We may update these Terms from time to time. Material changes will be communicated via email to the account owner at least 30 days before taking effect. We will also post a notice within the Service. Continued use of the Service after the effective date of changes constitutes your acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service and may request account deletion.',
              },
              {
                title: '20. Severability',
                content: 'If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining Terms remain in full force and effect.',
              },
              {
                title: '21. Contact',
                content: 'For questions about these Terms, contact us at support@palmtai.com, through our Contact page at palmcareai.com/contact, or by mail at: Palm Technologies, Inc., Omaha, NE.',
              },
            ].map((section, i) => (
              <div key={i}>
                <h2 className="text-xl font-semibold text-white mb-3">{section.title}</h2>
                <p className="text-dark-300 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-dark-700/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /><span className="text-dark-400 text-sm">HIPAA Compliant</span></div>
            <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-600" /><span className="text-dark-400 text-sm">256-bit Encrypted</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
