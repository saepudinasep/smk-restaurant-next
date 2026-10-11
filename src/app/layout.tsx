import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';
import { RouteProgress } from '@/components/route-progress';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'SMK Restaurant',
    template: '%s | SMK Restaurant',
  },
  description:
    'SMK Restaurant is a modern and responsive restaurant website template built with Next.js, Tailwind CSS, and TypeScript. It provides a clean and user-friendly interface for showcasing your restaurant menu, managing orders, and engaging with customers.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const session = await auth();
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col'>
        <SessionProvider session={session}>
          <RouteProgress />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
