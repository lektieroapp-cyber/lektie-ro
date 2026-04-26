import type { Metadata, Viewport } from "next"
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

// `interactiveWidget: "resizes-content"` makes Android Chrome (and other
// Chromium browsers) shrink dvh / the layout viewport when the soft keyboard
// opens, instead of overlaying it. iOS Safari ignores this hint — for iOS we
// rely on VisualViewportSync (mounted in the parent layout) to track the
// keyboard via window.visualViewport.height.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${inter.variable} ${nunito.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
