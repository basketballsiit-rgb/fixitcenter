import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) — วิทยาลัยสารพัดช่างน่าน',
  description: 'ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) วิทยาลัยสารพัดช่างน่าน',
  manifest: '/fixitcenter/manifest.json',
  icons: '/fixitcenter/logo.png',
};

export const viewport: Viewport = {
  themeColor: '#f37021',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
