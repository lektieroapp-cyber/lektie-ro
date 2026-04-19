"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "./Logo"

// Logo link in the Navbar. When already on the target page, clicking it
// smooth-scrolls to top instead of doing a no-op navigation.
export function LogoLink({ href }: { href: string }) {
  const pathname = usePathname()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === href) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <Link href={href} onClick={handleClick} className="inline-flex items-center">
      <Logo size="md" />
    </Link>
  )
}
