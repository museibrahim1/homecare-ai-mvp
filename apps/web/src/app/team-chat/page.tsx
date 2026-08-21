'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Team Chat now lives as a tab on the Team Members page. This route redirects
// for any bookmarks or links (including Gmail OAuth callbacks) that still point
// at the old standalone page.
export default function TeamChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    // Preserve an OAuth ?code so the Gmail connect flow still completes on the tab
    params.set('tab', 'chat');
    router.replace(`/caregivers?${params.toString()}`);
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center glass-page">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  );
}
