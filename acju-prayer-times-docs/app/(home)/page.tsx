import Link from 'next/link';

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        url: 'https://salahsl.vercel.app/guide',
        name: 'ACJU Prayer Times API Documentation',
        description: 'Developer-friendly REST API providing Islamic prayer times for Sri Lanka.',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'ACJU Prayer Times API',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: 'Independent ACJU-sourced prayer-time API for Sri Lanka.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      }
    ]
  };

  return (
    <main className="flex flex-col min-h-screen bg-fd-background text-fd-foreground selection:bg-fd-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />


      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-3xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-sm font-mono tracking-widest text-fd-muted-foreground uppercase">ACJU Prayer Times API</h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Prayer-time infrastructure<br />for Sri Lanka.
            </h2>
            <p className="text-lg text-fd-muted-foreground max-w-xl mx-auto pt-4">
              Independent ACJU-sourced prayer-time API<br />
              built by <a href="https://github.com/hasnizihar/" target="_blank" rel="noopener noreferrer" className="text-fd-foreground hover:underline hover:text-fd-primary">KR Hasni Zihar</a>.
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-4 pt-4">
            <Link href="/docs" className="h-10 px-6 inline-flex items-center justify-center bg-fd-primary text-fd-primary-foreground font-medium text-sm rounded transition-opacity hover:opacity-90">
              Read the Docs
            </Link>
            <Link href="/docs/api-reference" className="h-10 px-6 inline-flex items-center justify-center border border-fd-border bg-fd-card text-fd-foreground font-medium text-sm rounded transition-colors hover:bg-fd-secondary">
              API Reference
            </Link>
          </div>

          <div className="pt-16 max-w-2xl mx-auto">
            <div className="text-left bg-fd-card border border-fd-border rounded-lg overflow-hidden">
              <div className="flex items-center px-4 py-2 border-b border-fd-border bg-fd-secondary">
                <span className="text-xs font-mono text-fd-muted-foreground">GET /api/v1/prayer-times/today?lat=7.2906&amp;lng=81.6337</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-fd-foreground !bg-transparent !border-0 p-0 m-0">
                  <code>{`{
  "data": {
    "location": {
      "slug": "batticaloa-ampara"
    },
    "date": "2026-08-25",
    "prayer_times": {
      "fajr": "04:37",
      "sunrise": "05:56",
      "dhuhr": "12:07",
      "asr": "15:15",
      "maghrib": "18:16",
      "isha": "19:26"
    }
  }
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="border-t border-fd-border bg-fd-card">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="text-fd-foreground font-medium">GPS → ACJU region</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">Resolve Sri Lankan coordinates into the appropriate ACJU location.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-fd-foreground font-medium">13 Locations</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">Structured location slugs for consistent API queries.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-fd-foreground font-medium">REST API</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">Simple HTTP + JSON designed to be consumed by any application.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-fd-foreground font-medium">OpenAPI</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">Machine-readable API contract for developers and tooling.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-fd-muted-foreground bg-fd-card">
        &copy; {new Date().getFullYear()} <a href="https://github.com/hasnizihar/" target="_blank" rel="noopener noreferrer" className="hover:text-fd-foreground transition-colors">KR Hasni Zihar</a>. All rights reserved.
      </footer>
    </main>
  );
}
