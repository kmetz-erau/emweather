import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WeatherOps · Two-Location Dashboard',
  description:
    'Side-by-side weather monitoring for facilities management, agriculture, and field operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
