import './globals.css';
import { Inter } from 'next/font/google';
import Providers from '@/components/Providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://nagafilms-studio.vercel.app';

const SOCIAL_IMAGE = '/assets/a93d164450bb4867af3a4af58d3c1470.png';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050505',
};

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: 'Naga Films Studio — AI Image, Video & Cinema',
  description:
    'Naga Films Studio — generate AI images, video, cinema shots and lip sync across 200+ models. Credit packs, no subscription.',
  openGraph: {
    title: 'Naga Films Studio — AI Image, Video & Cinema',
    description:
      'Generate AI images, video, cinema shots and lip sync across 200+ models. Credit packs, no subscription.',
    type: 'website',
    siteName: 'Naga Films Studio',
    url: APP_URL,
    images: [
      {
        url: SOCIAL_IMAGE,
        width: 1024,
        height: 1024,
        alt: 'Naga Films Studio — generative production stack',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Naga Films Studio — AI Image, Video & Cinema',
    description:
      'Generate AI images, video, cinema shots and lip sync across 200+ models. Credit packs, no subscription.',
    images: [SOCIAL_IMAGE],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
