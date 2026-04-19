import type { Metadata } from "next"
import { Fraunces, Inter, Nunito } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
})

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "LektieRo",
    template: "%s · LektieRo",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${inter.variable} ${nunito.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
