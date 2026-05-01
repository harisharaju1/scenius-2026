import Link from 'next/link'
import { logoutAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username: string | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    username = data?.username ?? null
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-white dark:bg-neutral-950 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          scenius
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {username ? (
            <>
              <span className="px-2 text-neutral-500">{username}</span>
              <form action={logoutAction}>
                <button type="submit" className="min-h-[44px] px-2 hover:text-neutral-800 dark:hover:text-neutral-200">
                  logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="min-h-[44px] px-2 flex items-center hover:text-neutral-800 dark:hover:text-neutral-200">
                log in
              </Link>
              <Link href="/register" className="min-h-[44px] px-2 flex items-center font-medium hover:text-neutral-800 dark:hover:text-neutral-200">
                register
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
