import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Tag } from 'lucide-react';
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
  Industry: 'bg-blue-500/20 text-blue-300',
  Product: 'bg-teal-500/20 text-teal-300',
  Compliance: 'bg-amber-500/20 text-amber-300',
  Operations: 'bg-purple-500/20 text-purple-300',
  Education: 'bg-green-500/20 text-green-300',
};

export default function BlogPage() {
  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
            </div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-dark-300 hover:text-white transition text-sm">Home</Link>
            <Link href="/features" className="text-dark-300 hover:text-white transition text-sm">Features</Link>
            <Link href="/blog" className="text-white font-medium text-sm">Blog</Link>
            <a href="/#book-demo" className="btn-primary py-2 px-4 text-sm">Book Demo</a>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary-400 font-semibold tracking-wide uppercase text-sm mb-3">Blog</p>
            <h1 className="text-5xl font-bold text-white mb-4">Insights for Home Care Leaders</h1>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              AI, compliance, operations, and growth — everything your agency needs to stay ahead.
            </p>
          </div>

          {/* Featured post */}
          <Link
            href={`/blog/${featured.slug}`}
            className="block mb-12 group"
          >
            <div className="card bg-dark-800/60 border-dark-700 hover:border-primary-500/40 transition-all p-8 md:p-10 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[featured.category] || 'bg-dark-600 text-dark-300'}`}>
                  {featured.category}
                </span>
                <span className="text-dark-400 text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {featured.readTime}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 group-hover:text-primary-400 transition">
                {featured.title}
              </h2>
              <p className="text-dark-400 text-lg mb-4 leading-relaxed">{featured.description}</p>
              <div className="flex items-center gap-2 text-primary-400 font-medium">
                Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Rest of posts */}
          <div className="grid md:grid-cols-2 gap-6">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group"
              >
                <div className="card bg-dark-800/40 border-dark-700 hover:border-primary-500/30 transition-all p-6 rounded-xl h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[post.category] || 'bg-dark-600 text-dark-300'}`}>
                      {post.category}
                    </span>
                    <span className="text-dark-500 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary-400 transition leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed flex-1">{post.description}</p>
                  <div className="flex items-center gap-1.5 text-primary-400 text-sm font-medium mt-4">
                    Read more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-dark-400 text-sm">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
