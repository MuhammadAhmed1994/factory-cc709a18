import { redirect } from 'next/navigation'

// The middleware sends visitors without a session on to /login.
export default function Home() {
  redirect('/dashboard')
}