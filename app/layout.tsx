import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "LektieRo",
    template: "%s · LektieRo",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
