'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';
import { 
  Mic, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Play,
  Star,
  Zap,
  Shield,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Pause,
  SkipForward,
  Volume2,
  Video,
  Loader2,
  Mail,
  Building2,
  Phone,
  User,
  Brain,
  ClipboardList,
  HeartPulse,
  TrendingUp,
  Award,
  Globe,
  Headphones,
  Lock,
  Smartphone,
  PieChart,
  Settings,
  HelpCircle,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
} from 'lucide-react';

import { DemoModal } from '@/components/landing/DemoModal';
import { HeroOrb } from '@/components/landing/HeroOrb';
import { FaqItem } from '@/components/landing/FaqItem';
import { FEATURES_TABS, TESTIMONIALS, SOLUTIONS, FAQ_ITEMS } from '@/components/landing/data';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('ai');
  const [navDropdown, setNavDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      {/* ── NAVIGATION ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {/* Features dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 pt-2 w-[520px] max-w-[calc(100vw-2rem)]">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { href: '/features#ai', icon: Brain, label: 'AI Intelligence', desc: 'Voice assessments & smart contracts' },
                        { href: '/features#ops', icon: ClipboardList, label: 'Agency Operations', desc: 'CRM, scheduling & visit management' },
                        { href: '/features#billing', icon: BarChart3, label: 'Billing & Reports', desc: 'Automated billing & analytics' },
                        { href: '/features#caregiver', icon: Smartphone, label: 'Caregiver Tools', desc: 'Mobile app & ADL logging' },
                        { href: '/features#templates', icon: FileText, label: 'Templates & OCR', desc: 'Upload & auto-fill contracts' },
                        { href: '/features#security', icon: Lock, label: 'Security & Compliance', desc: 'HIPAA compliant & encrypted' },
                      ].map(item => (
                        <Link key={item.href} href={item.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition group">
                          <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                            <item.icon className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-dark-400 text-xs">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('solutions')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 pt-2 w-72">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Small Agencies', desc: 'Up to 30 clients', href: '#solutions' },
                        { label: 'Medium Agencies', desc: '30–200 clients', href: '#solutions' },
                        { label: 'Enterprise', desc: '200+ clients', href: '#solutions' },
                      ].map(item => (
                        <a key={item.label} href={item.href} onClick={() => setNavDropdown(null)} className="block p-3 rounded-lg hover:bg-dark-700 transition">
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-dark-400 text-xs">{item.desc}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resources dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('resources')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'resources' && (
                  <div className="absolute top-full left-0 pt-2 w-64">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Blog', href: '/blog' },
                        { label: 'FAQ', href: '/faq' },
                        { label: 'Contact Us', href: '/contact' },
                        { label: 'System Status', href: '/status' },
                        { label: 'Privacy Policy', href: '/privacy' },
                      ].map(item => (
                        <Link key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-dark-700 transition text-white text-sm font-medium">{item.label}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/mobile-app" className="px-3 py-2 text-dark-300 hover:text-white transition">Mobile App</Link>
              <Link href="/pricing" className="px-3 py-2 text-dark-300 hover:text-white transition">Pricing</Link>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-dark-300 hover:text-white transition px-3 py-2">Sign In</Link>
              <Link href="/register" className="btn-primary py-2 px-5 text-sm">Sign Up Free</Link>
            </div>

            <button aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-dark-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-3 border-t border-dark-700 mt-4">
              <Link href="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Features</Link>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Solutions</a>
              <Link href="/mobile-app" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Mobile App</Link>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Pricing</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Contact</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block btn-primary py-2 px-5 text-sm text-center mt-4">Sign Up Free</Link>
            </div>
          )}
        </div>
      </nav>

      <main>
      {/* ═══ 1. HERO — The Hook ═══ */}
      <HeroOrb />

      {/* ═══ 2. HOW IT WORKS — Instant clarity ═══ */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Three Steps. Zero Paperwork.</h2>
            <p className="text-xl text-dark-400">From assessment to signed contract — AI handles the rest.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Record It', description: 'Staff records a client assessment interview on their phone — in person or over the phone. One tap to start.', icon: Mic },
              { step: '2', title: 'Transcribe It', description: 'AI transcribes the conversation, identifies speakers, and extracts every care need and billable item automatically.', icon: Zap },
              { step: '3', title: 'Contract It', description: 'A complete assessment, care plan, and service agreement is generated — ready to send and sign.', icon: FileText },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">{item.step}</div>
                <div className="card p-8 pt-10">
                  <item.icon className="w-10 h-10 text-primary-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-dark-400">{item.description}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2"><ChevronRight className="w-8 h-8 text-dark-600" /></div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/register" data-track="howit-cta-trial" className="btn-primary inline-flex items-center gap-2 py-4 px-8 text-lg">
              Start Your 14-Day Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-dark-500 text-sm mt-4">Full access for 14 days. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* ═══ 3. SIGNUP CTA — Primary conversion point ═══ */}
      <section id="signup" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Start Free Today</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Agency?</h2>
          <p className="text-xl text-dark-400 mb-8">Sign up in 2 minutes. Get 14 days of full access — no charge until the trial ends.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" data-track="signup-cta-trial" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
              Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/pricing" data-track="signup-cta-pricing" className="flex items-center gap-2 py-4 px-8 text-lg rounded-lg text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition">
              View Pricing <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 mt-6 text-dark-500 text-sm">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> HIPAA Compliant</div>
            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-400" /> Powered by Stripe</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" /> Cancel Anytime</div>
          </div>
        </div>
      </section>

      {/* ═══ 4. FEATURES — Detail for deeper researchers ═══ */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Settings className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Platform Features</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Run Your Agency</h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">Built for care professionals. Not retrofitted from generic software.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveFeatureTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeFeatureTab === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-dark-800 text-dark-300 hover:text-white border border-dark-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES_TABS.find(t => t.id === activeFeatureTab)?.features.map((feature, i) => (
              <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all h-full flex flex-col">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden border border-dark-700 mb-5 bg-dark-900/60 flex items-center justify-center shrink-0">
                  <Image
                    src={feature.image}
                    alt={`${feature.title} screenshot`}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/features" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition">
              View All Features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 5. SOLUTIONS BY SIZE — Self-identification ═══ */}
      <section id="solutions" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Building2 className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Solutions by Agency Size</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Built for Agencies of Every Size</h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">Whether you serve 10 clients or 1,000+, PalmCare AI scales with your agency.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {SOLUTIONS.map((sol, i) => (
              <div key={i} className="card p-8 group hover:border-primary-500/30 transition-all">
                <div className={`w-14 h-14 bg-gradient-to-br ${sol.gradient} rounded-2xl flex items-center justify-center mb-5`}>
                  <sol.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{sol.size}</h3>
                <p className="text-primary-400 font-medium text-sm mb-4">{sol.clients}</p>
                <p className="text-dark-400 mb-6 leading-relaxed">{sol.description}</p>
                <ul className="space-y-2">
                  {sol.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-dark-300 text-sm"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-6 block text-center py-3 rounded-xl font-medium bg-primary-500 text-white hover:bg-primary-600 transition">Start Free Trial</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS — Social proof ═══ */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Care Professionals</h2>
            <p className="text-xl text-dark-400">See why agencies are switching to PalmCare AI</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card p-8 flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-dark-200 text-lg mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
                {t.metric && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full mb-4 w-fit">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">{t.metric}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{t.author}</p>
                  <p className="text-sm text-dark-400">{t.role}</p>
                  <p className="text-xs text-dark-500">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. GETTING STARTED — Ease of entry ═══ */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Getting Started is Easy</h2>
            <p className="text-xl text-dark-400">Three simple steps — then Palm It</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Sign Up Free', description: 'Create your account in under 2 minutes. Pick your plan and start your 14-day free trial instantly.', icon: Sparkles },
              { step: '2', title: 'Record Your First Assessment', description: 'Open the mobile app, tap record, and speak naturally. AI transcribes and extracts everything automatically.', icon: Mic },
              { step: '3', title: 'Palm It', description: 'A complete contract is generated in seconds. Send it, sign it, and watch paperwork disappear forever.', icon: TrendingUp },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/20">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-primary-400 mb-2">Step {item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-dark-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. FINAL CTA — Last conversion push ═══ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">Your Next Client is Waiting</h2>
            <p className="text-xl text-dark-300 mb-8">Close faster. Document smarter. Never lose a client to paperwork again.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" data-track="final-cta-trial" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Start Your 14-Day Free Trial <ArrowRight className="w-5 h-5" /></Link>
            </div>
            <p className="text-dark-400 text-sm mt-6">Full access for 14 days &bull; Cancel anytime &bull; Powered by Stripe</p>
          </div>
        </div>
      </section>

      {/* ═══ 9. FAQ — Bottom, for hesitant visitors ═══ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-dark-400">Everything you need to know about PalmCare AI</p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
          <div className="text-center mt-8">
            <p className="text-dark-400 mb-3">Still have questions?</p>
            <div className="flex justify-center gap-4">
              <Link href="/faq" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition">
                View all FAQs <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 text-dark-400 hover:text-white font-medium transition">
                Contact our team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm mb-4 leading-relaxed">
                Record it. Transcribe it. Contract it. All in your palm. Built for care professionals.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-dark-400 text-sm">HIPAA Compliant</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/mobile-app" className="hover:text-white transition">Mobile App</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Free Trial</Link></li>
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Company</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Free Trial</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Legal</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy#hipaa" className="hover:text-white transition">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
            <div className="flex items-center flex-wrap gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-dark-400 text-sm">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span className="text-dark-400 text-sm">256-bit Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-sm border-t border-dark-700 py-3 px-4 sm:px-6 lg:hidden pb-safe">
        <div className="flex items-center justify-between gap-3">
          <p className="text-white text-sm font-medium hidden sm:block">Your next client is waiting</p>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Link href="/register" className="flex-1 text-center btn-primary py-2.5 px-4 text-sm">Sign Up Free</Link>
          </div>
        </div>
      </div>

      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
      <ChatWidget />
    </div>
  );
}
