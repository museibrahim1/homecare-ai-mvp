'use client';

import { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import {
  Layers, Download, Eye, X, Smartphone, Monitor, Mail, Share2,
  Image as ImageIcon, FileText, ChevronDown, ExternalLink
} from 'lucide-react';

type Category = 'all' | 'email' | 'social' | 'crm' | 'ios' | 'branding';

interface Asset {
  src: string;
  title: string;
  category: Category;
  dimensions?: string;
  use: string;
}

const ASSETS: Asset[] = [
  // Email assets
  { src: '/screenshots/email/app_interface.png', title: 'App Interface Banner', category: 'email', dimensions: '580px wide', use: 'Agency outreach emails — full-width CTA banner' },
  { src: '/screenshots/email/recording_screen.png', title: 'Voice Recording Screen', category: 'email', dimensions: '280px wide', use: 'Template 1 email — side-by-side with contract' },
  { src: '/screenshots/email/contract_view.png', title: 'Contract View', category: 'email', dimensions: '280px wide', use: 'Template 1 email — shows AI-generated contract' },
  { src: '/screenshots/email/home_dashboard.png', title: 'Mobile Dashboard', category: 'email', dimensions: '280px wide', use: 'Email headers, mobile app showcase' },
  { src: '/screenshots/email/crm_dashboard.png', title: 'CRM Dashboard', category: 'email', dimensions: '580px wide', use: 'Template 2 email — full-width platform overview' },
  { src: '/screenshots/email/crm_clients.png', title: 'Client Management', category: 'email', dimensions: '280px wide', use: 'Template 2 email — CRM client list' },
  { src: '/screenshots/email/crm_pipeline.png', title: 'Deals Pipeline', category: 'email', dimensions: '280px wide', use: 'Template 2 email — visual pipeline' },
  { src: '/screenshots/email/crm_assessments.png', title: 'Assessments View', category: 'email', dimensions: '280px wide', use: 'Template 3 email — assessment tracking' },
  { src: '/screenshots/email/crm_contract.png', title: 'Contract Preview', category: 'email', dimensions: '280px wide', use: 'Template 3 email — contract generation' },

  // ── LinkedIn / Facebook / Twitter (Nano Banana Pro — palm tree brand) ──
  { src: '/marketing/social/linkedin_palm_hero.png', title: 'LinkedIn Hero — Palm Trees', category: 'social', dimensions: '2K 16:9', use: 'LinkedIn cover, website hero, palm tree brand imagery' },
  { src: '/marketing/social/linkedin_caregiver_assessment.png', title: 'LinkedIn — Caregiver Assessment', category: 'social', dimensions: '2K 16:9', use: 'LinkedIn posts, caregiver recording assessment at home' },
  { src: '/marketing/social/linkedin_crm_showcase.png', title: 'LinkedIn — CRM Showcase', category: 'social', dimensions: '2K 16:9', use: 'LinkedIn posts, MacBook + iPhone product shot' },
  { src: '/marketing/social/linkedin_team_outdoors.png', title: 'LinkedIn — Team Under Palms', category: 'social', dimensions: '2K 16:9', use: 'LinkedIn team photo, diverse healthcare professionals' },
  { src: '/marketing/social/fb_ad_palm_sunset.png', title: 'FB Ad — Palm Sunset', category: 'social', dimensions: '2K 16:9', use: 'Facebook ads, sunset palm tree brand shot' },
  { src: '/marketing/social/fb_ad_problem_solution.png', title: 'FB Ad — Problem/Solution', category: 'social', dimensions: '2K 16:9', use: 'Facebook ads, paperwork vs digital split' },
  { src: '/marketing/social/fb_ad_three_phones.png', title: 'FB Ad — Three Phones', category: 'social', dimensions: '2K 16:9', use: 'Facebook ads, Record → Analyze → Contract flow' },
  { src: '/marketing/social/twitter_brand_banner.png', title: 'Twitter/X Banner — Palms', category: 'social', dimensions: '2K 21:9', use: 'Twitter/X profile banner, palm coastline' },

  // ── Instagram Feed (square + 4:5) ──
  { src: '/marketing/social/ig_square_palm_app.png', title: 'IG — Palm + App', category: 'social', dimensions: '2K 1:1', use: 'Instagram feed, phone with palm tree bokeh' },
  { src: '/marketing/social/ig_square_assessment_home.png', title: 'IG — Home Assessment', category: 'social', dimensions: '2K 1:1', use: 'Instagram feed, caregiver recording in home' },
  { src: '/marketing/social/ig_square_contract_signing.png', title: 'IG — Contract Flat Lay', category: 'social', dimensions: '2K 1:1', use: 'Instagram feed, completed contract flat lay' },
  { src: '/marketing/social/ig_square_stats_infographic.png', title: 'IG — Stats Infographic', category: 'social', dimensions: '2K 1:1', use: 'Instagram feed, data visualization post' },

  // ── Instagram Stories (9:16) ──
  { src: '/marketing/social/ig_story_palm_phone.png', title: 'IG Story — Palm + Phone', category: 'social', dimensions: '2K 9:16', use: 'Instagram/FB story, phone against palm sunset' },
  { src: '/marketing/social/ig_story_assessment_vertical.png', title: 'IG Story — Assessment', category: 'social', dimensions: '2K 9:16', use: 'Instagram/FB story, caregiver with patient' },
  { src: '/marketing/social/ig_story_palm_it_cta.png', title: 'IG Story — PALM IT CTA', category: 'social', dimensions: '2K 9:16', use: 'Instagram/FB story, brand CTA with palm tree' },
  { src: '/marketing/social/ig_story_before_after.png', title: 'IG Story — Before/After', category: 'social', dimensions: '2K 9:16', use: 'Instagram/FB story, paperwork vs digital split' },

  // ── Carousel Series (1:1) ──
  { src: '/marketing/social/carousel_step1_record.png', title: 'Carousel 1 — Record', category: 'social', dimensions: '2K 1:1', use: 'Social carousel slide 1: Record the Assessment' },
  { src: '/marketing/social/carousel_step2_analyze.png', title: 'Carousel 2 — Analyze', category: 'social', dimensions: '2K 1:1', use: 'Social carousel slide 2: AI Extracts Everything' },
  { src: '/marketing/social/carousel_step3_contract.png', title: 'Carousel 3 — Contract', category: 'social', dimensions: '2K 1:1', use: 'Social carousel slide 3: Contract Ready' },
  { src: '/marketing/social/carousel_step4_cta.png', title: 'Carousel 4 — PALM IT', category: 'social', dimensions: '2K 1:1', use: 'Social carousel final CTA slide' },

  // ── iPhone Mockups (Nano Banana Pro) ──
  { src: '/marketing/social/iphone_mockup_home.png', title: 'iPhone — Home Dashboard', category: 'social', dimensions: '2K 9:16', use: 'App Store screenshots, social posts' },
  { src: '/marketing/social/iphone_mockup_recording.png', title: 'iPhone — Recording', category: 'social', dimensions: '2K 9:16', use: 'App Store screenshots, voice assessment' },
  { src: '/marketing/social/iphone_mockup_contract.png', title: 'iPhone — Contract', category: 'social', dimensions: '2K 9:16', use: 'App Store screenshots, contract view' },

  // ── Brand Visuals ──
  { src: '/marketing/social/palm_brand_sunset.png', title: 'Palm Brand — Sunset', category: 'social', dimensions: '2K 16:9', use: 'Brand imagery, palm trees sunset with data overlay' },
  { src: '/marketing/social/palm_brand_minimal.png', title: 'Palm Brand — Minimal', category: 'social', dimensions: '2K 1:1', use: 'Brand imagery, minimal palm tree illustration' },

  // ── Legacy social assets ──
  { src: '/marketing/hero_banner.png', title: 'Hero Banner (v1)', category: 'social', dimensions: '1920×1080', use: 'Legacy website hero' },
  { src: '/marketing/linkedin_crm.png', title: 'LinkedIn CRM (v1)', category: 'social', dimensions: '1200×1200', use: 'Legacy LinkedIn post' },
  { src: '/marketing/email_header.png', title: 'Email Header (v1)', category: 'social', dimensions: '600×200', use: 'Legacy email header' },

  // CRM screenshots
  { src: '/screenshots/crm/dashboard.png', title: 'Dashboard Overview', category: 'crm', use: 'Website features page, pitch deck, demos' },
  { src: '/screenshots/crm/clients.png', title: 'Client List', category: 'crm', use: 'CRM feature showcase' },
  { src: '/screenshots/crm/assessments.png', title: 'Assessments', category: 'crm', use: 'Assessment tracking feature' },
  { src: '/screenshots/crm/deals_pipeline.png', title: 'Deals Pipeline', category: 'crm', use: 'Sales pipeline feature' },
  { src: '/screenshots/crm/contract_preview.png', title: 'Contract Preview', category: 'crm', use: 'Contract generation feature' },
  { src: '/screenshots/crm/create_contract.png', title: 'Create Contract', category: 'crm', use: 'Contract creation workflow' },
  { src: '/screenshots/crm/schedule.png', title: 'Schedule View', category: 'crm', use: 'Scheduling feature' },
  { src: '/screenshots/crm/billables.png', title: 'Billables', category: 'crm', use: 'Billing extraction feature' },
  { src: '/screenshots/crm/dashboard_2.png', title: 'Dashboard (Alt)', category: 'crm', use: 'Alternative dashboard view' },

  // iOS app screenshots
  { src: '/screenshots/ios/00_landing_fresh.png', title: 'iOS — Landing', category: 'ios', use: 'App Store listing, website mobile page' },
  { src: '/screenshots/ios/01_home.png', title: 'iOS — Home', category: 'ios', use: 'App Store listing, feature overview' },
  { src: '/screenshots/ios/02_clients.png', title: 'iOS — Clients', category: 'ios', use: 'Mobile client management' },
  { src: '/screenshots/ios/03_record.png', title: 'iOS — Recording', category: 'ios', use: 'Voice assessment feature' },
  { src: '/screenshots/ios/03_client_detail.png', title: 'iOS — Client Detail', category: 'ios', use: 'Client profile view' },
  { src: '/screenshots/ios/04_workspace.png', title: 'iOS — Workspace', category: 'ios', use: 'Workspace management' },
  { src: '/screenshots/ios/06_visit_overview.png', title: 'iOS — Visit Overview', category: 'ios', use: 'Visit tracking feature' },
  { src: '/screenshots/ios/07_contract.png', title: 'iOS — Contract', category: 'ios', use: 'Mobile contract view' },

  // Branding
  { src: '/PalmCare_Full_v4.pdf', title: 'Pitch Deck (PDF)', category: 'branding', use: 'Investor outreach, meetings' },
];

const CATEGORIES: { key: Category; label: string; icon: typeof Layers }[] = [
  { key: 'all', label: 'All Assets', icon: Layers },
  { key: 'email', label: 'Email Templates', icon: Mail },
  { key: 'social', label: 'Social Media', icon: Share2 },
  { key: 'crm', label: 'CRM Screenshots', icon: Monitor },
  { key: 'ios', label: 'iOS App', icon: Smartphone },
  { key: 'branding', label: 'Branding', icon: FileText },
];

export default function MarketingMaterialsPage() {
  const [category, setCategory] = useState<Category>('all');
  const [lightbox, setLightbox] = useState<Asset | null>(null);

  const filtered = category === 'all' ? ASSETS : ASSETS.filter(a => a.category === category);
  const isPdf = (src: string) => src.endsWith('.pdf');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Marketing Materials</h1>
              <p className="text-sm text-slate-500">{ASSETS.length} assets across {CATEGORIES.length - 1} categories</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all' ? ASSETS.length : ASSETS.filter(a => a.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  category === cat.key
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  category === cat.key ? 'bg-white/20' : 'bg-slate-100'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden group hover:shadow-lg hover:border-teal-200 transition-all"
            >
              <div
                className="aspect-[4/3] relative bg-slate-100 cursor-pointer overflow-hidden"
                onClick={() => !isPdf(asset.src) && setLightbox(asset)}
              >
                {isPdf(asset.src) ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-300" />
                  </div>
                ) : (
                  <>
                    <Image
                      src={asset.src}
                      alt={asset.title}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  </>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-slate-800 mb-1 truncate">{asset.title}</h3>
                <p className="text-xs text-slate-400 mb-2 line-clamp-2">{asset.use}</p>
                <div className="flex items-center justify-between">
                  {asset.dimensions && (
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{asset.dimensions}</span>
                  )}
                  <a
                    href={asset.src}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    {isPdf(asset.src) ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                    {isPdf(asset.src) ? 'Open' : 'Download'}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No assets in this category</p>
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div
              className="max-w-4xl max-h-[85vh] relative"
              onClick={e => e.stopPropagation()}
            >
              <Image
                src={lightbox.src}
                alt={lightbox.title}
                width={1200}
                height={800}
                className="object-contain max-h-[80vh] rounded-lg"
              />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{lightbox.title}</p>
                  <p className="text-white/60 text-sm">{lightbox.use}</p>
                </div>
                <a
                  href={lightbox.src}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
