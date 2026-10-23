import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ToastProvider } from '../components/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Personal Expense Tracker',
  description: 'Record, categorize and summarize your daily expenses.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}