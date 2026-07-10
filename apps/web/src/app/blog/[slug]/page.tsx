import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { getPostBySlug, getAllSlugs } from '../data';
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
  // GitHub-style tables -> single-line HTML (so the paragraph pass below skips it).
  // Great for AEO: comparison tables are among the most-cited formats by AI engines.
  md = md.replace(
    /^\|(.+)\|[ \t]*\n\|[ :|\-]+\|[ \t]*\n((?:\|.*\|[ \t]*\n?)+)/gm,
    (_m, header: string, body: string) => {
      const ths = header
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
        .map((c) => `<th class="text-left font-semibold text-slate-900 px-3 py-2 border-b border-slate-300">${c}</th>`)
        .join('');
      const rows = body
        .trim()
        .split('\n')
        .map((row) => {
          const tds = row
            .replace(/^\s*\|/, '')
            .replace(/\|\s*$/, '')
            .split('|')
            .map((c) => c.trim())
            .map((c) => `<td class="align-top text-slate-600 px-3 py-2 border-b border-slate-200">${c}</td>`)
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');
      return `<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-slate-900 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-slate-900 mt-10 mb-4">$1</h2>')
    .replace(/^\- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-slate-600"><span class="text-slate-400 mt-0.5">☐</span> $1</li>')
    .replace(/^\- \[x\] (.+)$/gm, '<li class="flex items-start gap-2 text-slate-600"><span class="text-green-600 mt-0.5">✓</span> $1</li>')
    .replace(/^- \*\*(.+?)\*\* — (.+)$/gm, '<li class="text-slate-600 mb-2"><strong class="text-slate-900">$1</strong> — $2</li>')
    .replace(/^- (.+)$/gm, '<li class="text-slate-600 mb-1 ml-4 list-disc">$1</li>')
    .replace(/^\d+\. \*\*(.+?)\*\* — (.+)$/gm, '<li class="text-slate-600 mb-2"><strong class="text-slate-900">$1</strong> — $2</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-slate-600 mb-1 ml-4 list-decimal">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" class="text-primary-700 hover:text-primary-800 underline underline-offset-2" rel="noopener noreferrer">$1</a>')
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, '<a href="$2" class="text-primary-700 hover:text-primary-800 underline underline-offset-2">$1</a>')
    .replace(/^(?!<[hluoatd])((?!^\s*$).+)$/gm, '<p class="text-slate-600 leading-relaxed mb-4">$1</p>');
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

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      articleSection: post.category,
      image: 'https://palmcareai.com/og-image.png',
      author: { '@type': 'Organization', name: 'PalmCare AI', url: 'https://palmcareai.com' },
      publisher: {
        '@type': 'Organization',
        name: 'PalmCare AI',
        logo: { '@type': 'ImageObject', url: 'https://palmcareai.com/icon-512.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://palmcareai.com/blog/${slug}` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://palmcareai.com' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://palmcareai.com/blog' },
        { '@type': 'ListItem', position: 3, name: post.title, item: `https://palmcareai.com/blog/${slug}` },
      ],
    },
  ];

  // Listicles emit an ItemList so search and AI answer engines can cite the ranking directly.
  if (post.listItems?.length) {
    graph.push({
      '@type': 'ItemList',
      name: post.title,
      numberOfItems: post.listItems.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: post.listItems.map((name, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
      })),
    });
  }

  const jsonLd = { '@context': 'https://schema.org', '@graph': graph };
  const htmlContent = markdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/blog" className="hidden sm:block text-slate-600 hover:text-slate-900 transition text-sm px-2 py-2">Blog</Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-700 transition text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                {post.category}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-6">{post.description}</p>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatted}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
            </div>
          </header>

          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

          <div className="mt-16 p-8 rounded-2xl bg-slate-900 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Ready to see PalmCare AI in action?</h3>
            <p className="text-slate-300 mb-6">Record an assessment and watch it become a care plan, billables, and a signed contract.</p>
            <Link href="/register" className="btn-primary py-3 px-8 text-base inline-block">
              Start your 14-day free trial
            </Link>
          </div>
        </article>
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
