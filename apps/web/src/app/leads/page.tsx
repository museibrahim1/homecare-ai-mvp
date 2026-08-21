'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Leads now live as a tab on the Sales page. This route redirects for any
// bookmarks or links that still point at the old standalone page.
export default function LeadsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/pipeline?tab=leads');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center glass-page">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  );
}
