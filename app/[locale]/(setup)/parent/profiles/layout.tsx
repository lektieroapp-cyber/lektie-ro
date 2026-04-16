export default function ProfilesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-10 sm:py-16">
      <div className="flex flex-col items-center">
        <a href="/" className="block">
          <img src="/logo_with_text.png" alt="LektieRo" className="h-12 w-auto md:h-16" />
        </a>

        <h1
          className="mt-8 text-center text-3xl font-bold text-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Hvem laver lektier i dag?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tryk på din profil for at starte
        </p>

        {children}
      </div>
    </div>
  )
}
