import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import { WalkthroughProvider } from '@/lib/walkthrough';
import WalkthroughGuide from '@/components/WalkthroughGuide';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Homecare AI',
  description: 'Turn care assessments into proposal-ready service contracts',
};

// Inline script to set data-theme before first paint, preventing flash of wrong theme
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('homecare-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-dark-900 text-dark-100 min-h-screen`}>
        <ThemeProvider>
          <NotificationProvider>
            <WalkthroughProvider>
              {children}
              <WalkthroughGuide />
            </WalkthroughProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
