'use client';

import Link from 'next/link';
import { Mic, Shield, Lock } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
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
          <p className="text-dark-400 mb-12">Last updated: January 29, 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            {[
              {
                title: '1. Acceptance of Terms',
                content: 'By accessing or using PalmCare AI ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. The Service is operated by PalmCare AI, accessible at palmcareai.com and palmtai.com.',
              },
              {
                title: '2. Description of Service',
                content: 'PalmCare AI provides an AI-powered home care management platform including voice-powered care assessments, automated contract generation, client management (CRM), billing extraction, caregiver mobile tools, and related services. The Service is designed for use by home care agencies, their staff, and authorized caregivers.',
              },
              {
                title: '3. User Accounts',
                content: 'You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use. Accounts must be registered by persons 18 years of age or older.',
              },
              {
                title: '4. Subscription & Billing',
                content: 'The Service is offered on a subscription basis. Plans are billed monthly or annually. Free trial periods are 14 days. You may cancel at any time. Refunds are handled per our Refund Policy. Prices are subject to change with 30 days notice.',
              },
              {
                title: '5. Data Privacy & HIPAA',
                content: 'We take data privacy seriously. All protected health information (PHI) is handled in compliance with HIPAA regulations. We offer Business Associate Agreements (BAAs) for all paying customers. See our Privacy Policy for full details on data collection, use, and protection.',
              },
              {
                title: '6. Acceptable Use',
                content: 'You agree to use the Service only for lawful purposes related to home care agency operations. You may not: (a) reverse-engineer or decompile the Service, (b) use the Service to store or transmit malicious content, (c) attempt unauthorized access, (d) resell access without authorization, or (e) use the AI features to generate misleading or fraudulent documents.',
              },
              {
                title: '7. Intellectual Property',
                content: 'The Service, including its software, design, logos, and content, is the property of PalmCare AI and protected by intellectual property laws. Your data (client records, contracts, templates) remains your property. You grant us a limited license to process your data solely to provide the Service.',
              },
              {
                title: '8. Service Availability',
                content: 'We target 99.9% uptime but do not guarantee uninterrupted availability. Scheduled maintenance will be communicated in advance. Our status page at palmcareai.com/status provides real-time system information.',
              },
              {
                title: '9. Limitation of Liability',
                content: 'To the maximum extent permitted by law, PalmCare AI shall not be liable for indirect, incidental, special, or consequential damages. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.',
              },
              {
                title: '10. Termination',
                content: 'Either party may terminate the subscription at any time. Upon termination, you retain the right to export your data for 30 days. We may terminate accounts that violate these terms or are used for fraudulent purposes.',
              },
              {
                title: '11. Changes to Terms',
                content: 'We may update these terms from time to time. Material changes will be communicated via email to the account owner at least 30 days before taking effect. Continued use of the Service after changes constitutes acceptance.',
              },
              {
                title: '12. Contact',
                content: 'For questions about these Terms, contact us at support@palmtai.com or through our Contact page.',
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

      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><span className="text-dark-400 text-sm">HIPAA Compliant</span></div>
            <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-400" /><span className="text-dark-400 text-sm">256-bit Encrypted</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
