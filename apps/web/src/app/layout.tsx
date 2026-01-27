import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Homecare AI',
  description: 'Turn care assessments into proposal-ready service contracts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-dark-900 text-dark-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
