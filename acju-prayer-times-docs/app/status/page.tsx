import Link from 'next/link';

export const metadata = {
  title: 'Status | SalahSL API',
  description: 'System status for the SalahSL API.',
};

async function getStatus() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://salahsl.vercel.app/api/v1';
    const res = await fetch(`${baseUrl}/health`, { 
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function StatusPage() {
  const isOperational = await getStatus();

  return (
    <div className="flex flex-col w-full text-fd-foreground selection:bg-fd-muted">      <div className="max-w-2xl mx-auto w-full px-6 py-20 flex-1">
        <div className="space-y-8">
          <div className="space-y-2 border-b border-fd-border pb-6">
            <h1 className="text-2xl font-semibold tracking-tight">SYSTEM STATUS</h1>
            <p className="text-sm text-fd-muted-foreground">Current operational status of API infrastructure.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-fd-border">
              <span className="text-sm font-medium text-fd-foreground">API</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}></div>
                <span className="text-sm text-fd-muted-foreground">{isOperational ? 'Operational' : 'Down'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-fd-border">
              <span className="text-sm font-medium text-fd-foreground">Database</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}></div>
                <span className="text-sm text-fd-muted-foreground">{isOperational ? 'Operational' : 'Down'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-fd-border">
              <span className="text-sm font-medium text-fd-foreground">GPS Resolution</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}></div>
                <span className="text-sm text-fd-muted-foreground">{isOperational ? 'Operational' : 'Down'}</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-xs text-fd-muted-foreground">
              Last checked: just now
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-8 text-center text-sm text-fd-muted-foreground">
        &copy; {new Date().getFullYear()} <a href="https://github.com/hasnizihar/" target="_blank" rel="noopener noreferrer" className="hover:text-fd-foreground transition-colors">KR Hasni Zihar</a>. All rights reserved.
      </footer>
    </div>
  );
}
