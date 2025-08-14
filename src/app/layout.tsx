import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NexVision - AI Exterior Home Design | Transform Your Home's Curb Appeal",
  description: "Upload a photo of your home, describe your dream exterior, and watch AI instantly transform your property. Professional exterior design and curb appeal transformations in 30 seconds. Try 3 free!",
  keywords: "AI exterior design, home exterior makeover, curb appeal, exterior renovation, home transformation AI, exterior design AI, house exterior design, home facade design",
  authors: [{ name: "NexVision" }],
  creator: "NexVision",
  publisher: "NexVision",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://nexvision.app'), // Update with your actual domain
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "NexVision - AI Exterior Home Design | Transform Your Home's Curb Appeal",
    description: "Upload a photo of your home, describe your dream exterior, and watch AI instantly transform your property. Professional exterior design results in 30 seconds.",
    url: 'https://nexvision.app',
    siteName: 'NexVision',
    images: [
      {
        url: '/og-image.jpg', // You'll need to create this
        width: 1200,
        height: 630,
        alt: 'NexVision AI Exterior Home Design',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "NexVision - AI Exterior Home Design",
    description: "Transform your home's exterior with AI in 30 seconds. Try free!",
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
