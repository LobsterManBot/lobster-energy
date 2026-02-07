import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lobster Energy 🦞⚡',
  description: 'AI-powered energy procurement advisory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🦞</span>
                <span className="text-xl font-bold text-gray-900">
                  Lobster Energy
                </span>
                <span className="ml-2 text-sm text-gray-500">⚡</span>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/" className="text-gray-700 hover:text-lobster-600 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/forecast" className="text-gray-700 hover:text-lobster-600 px-3 py-2 rounded-md text-sm font-medium">
                  Forecast
                </a>
                <a href="/signals" className="text-gray-700 hover:text-lobster-600 px-3 py-2 rounded-md text-sm font-medium">
                  Signals
                </a>
                <a href="/compare" className="text-gray-700 hover:text-lobster-600 px-3 py-2 rounded-md text-sm font-medium">
                  Compare Contracts
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
