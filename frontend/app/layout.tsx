import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { PostHogProvider } from '@/components/PostHogProvider';
import { PostHogPageView } from '@/components/PostHogPageView';

export const metadata: Metadata = {
  title: 'Lobster Energy | AI-Powered Energy Market Intelligence for Brokers',
  description: 'Win more clients with AI-powered trading signals. Data-backed recommendations for energy brokers and TPIs. Know when to advise clients to buy.',
  keywords: 'energy broker, TPI, energy procurement, electricity prices, trading signals, UK energy market',
  openGraph: {
    title: 'Lobster Energy | AI-Powered Market Intelligence for Energy Brokers',
    description: 'Win more clients with AI-powered trading signals. Data-backed recommendations that build trust and close deals.',
    url: 'https://lobster.energy',
    siteName: 'Lobster Energy',
    images: [
      {
        url: '/lobster-logo.png',
        width: 500,
        height: 500,
        alt: 'Lobster Energy Logo',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Lobster Energy | AI-Powered Market Intelligence',
    description: 'Win more clients with AI-powered trading signals for energy brokers.',
    images: ['/lobster-logo.png'],
  },
  icons: {
    icon: '/lobster-logo.png',
    apple: '/lobster-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/lobster-logo.png" />
      </head>
      <body>
        <PostHogProvider>
          <PostHogPageView />
          <Providers>
            {children}
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
