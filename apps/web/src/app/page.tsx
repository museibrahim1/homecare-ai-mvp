'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice-Powered Assessments',
    description: 'Record care assessments naturally. Our AI transcribes and extracts key information automatically.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FileText,
    title: 'Auto-Generated Contracts',
    description: 'Transform assessments into professional, proposal-ready contracts in seconds.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'CRM-style pipeline to track clients from intake through active care.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Billing & Reports',
    description: 'Automatic billable extraction and comprehensive reporting dashboard.',
    color: 'from-orange-500 to-red-500',
  },
];

const TESTIMONIALS = [
  {
    quote: "HomeCare AI cut our contract generation time from hours to minutes. Game changer.",
    author: "Sarah M.",
    role: "Agency Owner, Texas",
    rating: 5,
  },
  {
    quote: "The voice assessment feature lets our caregivers focus on clients, not paperwork.",
    author: "Michael R.",
    role: "Operations Director, Florida",
    rating: 5,
  },
  {
    quote: "Finally, a system built for home care agencies. Not retrofitted from something else.",
    author: "Jennifer L.",
    role: "Care Coordinator, California",
    rating: 5,
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: 295,
    description: 'For small agencies getting organized',
    features: ['25 contracts/month', '50 clients in CRM', '25 caregivers', '3 team seats', 'Email support'],
    popular: false,
  },
  {
    name: 'Growth',
    price: 495,
    description: 'For growing teams',
    features: ['100 contracts/month', '200 clients in CRM', '100 caregivers', '10 team seats', 'Priority support'],
    popular: true,
  },
  {
    name: 'Pro',
    price: 895,
    description: 'For high-volume teams',
    features: ['300 contracts/month', '1,000 clients in CRM', '500 caregivers', 'Unlimited seats', 'Advanced analytics'],
    popular: false,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Custom solutions',
    features: ['Unlimited everything', 'Custom templates', 'Dedicated success manager', 'API access', 'SLA guarantee'],
    popular: false,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HomeCare AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-dark-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-dark-300 hover:text-white transition">Pricing</a>
              <a href="#testimonials" className="text-dark-300 hover:text-white transition">Testimonials</a>
              <Link href="/login" className="text-dark-300 hover:text-white transition">Sign In</Link>
              <Link href="/register" className="btn-primary py-2 px-5 text-sm">
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 space-y-3">
              <a href="#features" className="block py-2 text-dark-300 hover:text-white">Features</a>
              <a href="#pricing" className="block py-2 text-dark-300 hover:text-white">Pricing</a>
              <a href="#testimonials" className="block py-2 text-dark-300 hover:text-white">Testimonials</a>
              <Link href="/login" className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <Link href="/register" className="block btn-primary py-2 px-5 text-sm text-center mt-4">
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                <Zap className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-primary-400">AI-Powered Home Care Management</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Turn Care Assessments Into
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> Contracts in Minutes</span>
              </h1>
              
              <p className="text-xl text-dark-300 mb-8 leading-relaxed">
                Stop spending hours on paperwork. Record assessments, auto-generate contracts, 
                and manage your home care agency with one powerful AI platform.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="btn-secondary flex items-center gap-2 py-4 px-8 text-lg">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center gap-6 mt-10">
                <div className="flex -space-x-3">
                  {['S', 'M', 'J', 'R'].map((initial, i) => (
                    <div 
                      key={i}
                      className={`w-10 h-10 rounded-full border-2 border-dark-900 flex items-center justify-center text-white font-semibold text-sm
                        ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-green-500' : 'bg-orange-500'}`}
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-dark-400">Trusted by 500+ agencies</p>
                </div>
              </div>
            </div>

            {/* Hero Image / Demo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 blur-3xl" />
              <div className="relative bg-dark-800 border border-dark-600 rounded-2xl p-6 shadow-2xl">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-4">
                  <div className="bg-dark-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Recording Assessment...</p>
                        <p className="text-sm text-dark-400">Client: Margaret Johnson</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 h-8">
                      {[...Array(30)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-primary-500 rounded-full animate-pulse"
                          style={{ 
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 50}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-white">24</p>
                      <p className="text-xs text-dark-400">Clients</p>
                    </div>
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-400">12</p>
                      <p className="text-xs text-dark-400">Contracts</p>
                    </div>
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-cyan-400">$8.2k</p>
                      <p className="text-xs text-dark-400">This Month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Run Your Agency
            </h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              Built specifically for home care agencies. Not adapted from generic software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              From Assessment to Contract in 3 Steps
            </h2>
            <p className="text-xl text-dark-400">Simple workflow, powerful results</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Record Assessment',
                description: 'Use voice or upload existing recordings. Our AI understands care-specific terminology.',
                icon: Mic,
              },
              {
                step: '2',
                title: 'AI Processes Data',
                description: 'Automatic transcription, speaker identification, and extraction of care needs.',
                icon: Zap,
              },
              {
                step: '3',
                title: 'Generate Contract',
                description: 'Get a professional, proposal-ready contract with services, schedule, and pricing.',
                icon: FileText,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {item.step}
                </div>
                <div className="card p-8 pt-10">
                  <item.icon className="w-10 h-10 text-primary-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-dark-400">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-dark-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-dark-400">Start free, upgrade as you grow</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PRICING.map((plan, i) => (
              <div 
                key={i} 
                className={`card p-6 relative ${plan.popular ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-dark-400 text-sm mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  {plan.price ? (
                    <>
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-dark-400">/mo</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-white">Custom</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-dark-300 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href={plan.price ? `/register?plan=${plan.name.toLowerCase()}` : '/contact?plan=enterprise'}
                  className={`block text-center py-3 rounded-xl font-medium transition ${
                    plan.popular 
                      ? 'btn-primary' 
                      : 'bg-dark-700 text-white hover:bg-dark-600'
                  }`}
                >
                  {plan.price ? 'Get Started' : 'Contact Sales'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Home Care Agencies
            </h2>
            <p className="text-xl text-dark-400">See what our customers are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="card p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-dark-200 text-lg mb-6">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-dark-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Agency?
            </h2>
            <p className="text-xl text-dark-300 mb-8">
              Join 500+ home care agencies using AI to streamline their operations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className="btn-secondary py-4 px-8 text-lg">
                Contact Sales
              </Link>
            </div>
            <p className="text-dark-400 text-sm mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HomeCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm">
                AI-powered home care management platform. Turn assessments into contracts.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-400 text-sm">
              © 2026 HomeCare AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-dark-400" />
              <span className="text-dark-400 text-sm">HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
