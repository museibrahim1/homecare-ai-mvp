import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Tag, Calendar } from 'lucide-react';
import { BLOG_POSTS, getPostBySlug, getAllSlugs } from '../data';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://palmcareai.com/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url: `https://palmcareai.com/blog/${slug}`,
    },
  };
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^\- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-dark-300"><span class="text-dark-500 mt-0.5">☐</span> $1</li>')
    .replace(/^\- \[x\] (.+)$/gm, '<li class="flex items-start gap-2 text-dark-300"><span class="text-green-400 mt-0.5">✓</span> $1</li>')
    .replace(/^- \*\*(.+?)\*\* — (.+)$/gm, '<li class="text-dark-300 mb-2"><strong class="text-white">$1</strong> — $2</li>')
    .replace(/^- (.+)$/gm, '<li class="text-dark-300 mb-1">$1</li>')
    .replace(/^\d+\. \*\*(.+?)\*\* — (.+)$/gm, '<li class="text-dark-300 mb-2"><strong class="text-white">$1</strong> — $2</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-dark-300 mb-1">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-400 hover:text-primary-300 underline underline-offset-2">$1</a>')
    .replace(/^(?!<[hluoa])((?!^\s*$).+)$/gm, '<p class="text-dark-300 leading-relaxed mb-4">$1</p>');
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const formatted = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'PalmCare AI', url: 'https://palmcareai.com' },
    publisher: {
      '@type': 'Organization',
      name: 'PalmCare AI',
      logo: { '@type': 'ImageObject', url: 'https://palmcareai.com/icon-512.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://palmcareai.com/blog/${slug}` },
  };

  const htmlContent = markdownToHtml(post.content);

  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/blog" className="text-dark-300 hover:text-white transition text-sm">Blog</Link>
            <a href="/#book-demo" className="btn-primary py-2 px-4 text-sm">Book Demo</a>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <article className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-primary-400 transition text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300">
                {post.category}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-xl text-dark-400 mb-6">{post.description}</p>
            <div className="flex items-center gap-4 text-dark-500 text-sm">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatted}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
            </div>
          </header>

          <div
            className="prose-dark"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border border-primary-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Ready to see PalmCare AI in action?</h3>
            <p className="text-dark-400 mb-6">Book a free 30-minute demo and see how voice-to-contract works for your agency.</p>
            <a href="/#book-demo" className="btn-primary py-3 px-8 text-base inline-block">
              Book Your Free Demo
            </a>
          </div>
        </article>
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
