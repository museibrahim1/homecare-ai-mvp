import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import { BLOG_POSTS } from './data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Home Care AI Insights & Industry News',
  description:
    'Expert articles on AI-powered home care software, HIPAA compliance, documentation automation, and agency growth strategies from the PalmCare AI team.',
  alternates: { canonical: 'https://palmcareai.com/blog' },
  openGraph: {
    title: 'PalmCare AI Blog',
    description:
      'Expert articles on AI-powered home care software, HIPAA compliance, documentation automation, and agency growth.',
    url: 'https://palmcareai.com/blog',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Industry: 'bg-blue-50 text-blue-700',
  Product: 'bg-teal-50 text-teal-700',
  Compliance: 'bg-amber-50 text-amber-700',
  Operations: 'bg-purple-50 text-purple-700',
  Education: 'bg-green-50 text-green-700',
  Pricing: 'bg-rose-50 text-rose-700',
  Comparison: 'bg-cyan-50 text-cyan-700',
};

export default function BlogPage() {
  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-slate-900">PalmCare AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="hidden sm:block text-slate-600 hover:text-slate-900 transition text-sm px-2 py-2">Home</Link>
            <Link href="/features" className="hidden sm:block text-slate-600 hover:text-slate-900 transition text-sm px-2 py-2">Features</Link>
            <Link href="/pricing" className="hidden sm:block text-slate-600 hover:text-slate-900 transition text-sm px-2 py-2">Pricing</Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10 sm:mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Blog</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Insights for home care leaders
            </h1>
            <p className="text-lg text-slate-600 mt-4">
              AI, compliance, operations, and growth — practical guides written for the people running agencies.
            </p>
          </div>

          {/* Featured post */}
          <Link href={`/blog/${featured.slug}`} className="block mb-8 sm:mb-10 group">
            <div className="card card-hover p-6 sm:p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[featured.category] || 'bg-slate-100 text-slate-600'}`}>
                  {featured.category}
                </span>
                <span className="text-slate-500 text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {featured.readTime}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 group-hover:text-primary-700 transition leading-tight">
                {featured.title}
              </h2>
              <p className="text-slate-600 text-base sm:text-lg mb-4 leading-relaxed max-w-3xl">{featured.description}</p>
              <span className="inline-flex items-center gap-2 text-primary-700 font-medium">
                Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          {/* Rest of posts */}
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <div className="card card-hover p-5 sm:p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[post.category] || 'bg-slate-100 text-slate-600'}`}>
                      {post.category}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary-700 transition leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed flex-1">{post.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-primary-700 text-sm font-medium mt-4">
                    Read more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-10 sm:py-12 px-4 sm:px-6 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">&copy; 2026 Palm Technologies, Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-500 text-sm">
            <Link href="/privacy" className="hover:text-slate-900 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition">Terms</Link>
            <Link href="/contact" className="hover:text-slate-900 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
