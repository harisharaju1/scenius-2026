import type { Metadata } from 'next'
import { Header } from '@/components/header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scenius',
  description: 'A small Reddit-like community.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        {children}
      </body>
    </html>
  )
}
