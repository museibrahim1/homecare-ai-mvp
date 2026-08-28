import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing: Mobile, Platform, and Enterprise',
  description:
    'PalmCare AI pricing: Mobile $89.99/mo (15 assessments, 30 clients), Platform $199.99/mo (30 assessments, 150 clients), Enterprise by quote. 30-day free trial via Apple In-App Purchase.',
  alternates: { canonical: 'https://palmcareai.com/pricing' },
  openGraph: {
    title: 'PalmCare AI Pricing: Mobile, Platform, Enterprise',
    description:
      'Mobile $89.99, Platform $199.99, or request an Enterprise quote. Start a 30-day free trial in the iOS app.',
  },
};

const PRICING_FAQS = [
  {
    q: 'Do I need a payment method for the free trial?',
    a: 'Yes. The 30-day free trial starts only when you subscribe in the PalmCare iOS app through Apple In-App Purchase. Apple requires a payment method on your Apple ID. Creating a web account alone does not unlock assessments.',
  },
  {
    q: 'What is the difference between Mobile and Platform?',
    a: 'Mobile ($89.99/mo) includes iPhone assessments and web CRM with 15 assessments and 30 clients per month. Platform ($199.99/mo) raises those caps to 30 assessments and 150 clients, and adds team seats plus fuller CRM tools. Enterprise is a custom quote.',
  },
  {
    q: 'Can Mobile subscribers use the web CRM?',
    a: 'Yes. Mobile includes web CRM with caps: 15 assessments and 30 clients per month. Upgrade to Platform in the app for higher limits and team features.',
  },
  {
    q: 'How do subscriptions and payments work?',
    a: 'Mobile and Platform are billed through Apple In-App Purchase in the PalmCare iOS app. Enterprise is sold with a custom quote. Open the app, go to Settings, Your Plan, pick a plan, and start the trial or subscribe.',
  },
  {
    q: 'What happens after the 30-day trial?',
    a: 'Unless you cancel at least 24 hours before the trial ends, Apple automatically charges your selected plan price and renews monthly until you cancel in iPhone Settings, Apple ID, Subscriptions.',
  },
  {
    q: 'Can I upgrade from Mobile to Platform?',
    a: 'Yes. Open the PalmCare app, go to Settings, Your Plan, and switch to PalmCare Platform. Apple prorates the change through your Apple ID subscription.',
  },
  {
    q: 'How do I cancel?',
    a: 'Manage or cancel Mobile and Platform anytime from iPhone Settings, your name, Subscriptions. If you cancel, you keep access until the end of your current billing period.',
  },
];

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      name: 'PalmCare AI',
      description:
        'AI home care documentation software with Mobile, Platform, and Enterprise plans.',
      brand: { '@type': 'Brand', name: 'PalmCare AI' },
      url: 'https://palmcareai.com/pricing',
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '89.99',
        highPrice: '199.99',
        priceCurrency: 'USD',
        offerCount: 3,
        url: 'https://palmcareai.com/pricing',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: PRICING_FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {children}
    </>
  );
}
