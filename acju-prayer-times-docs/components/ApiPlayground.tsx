'use client';

import { useState } from 'react';

interface ApiPlaygroundProps {
  endpoint: string;
  method?: string;
  defaultParams?: Record<string, string>;
}

export function ApiPlayground({ endpoint, method = 'GET', defaultParams = {} }: ApiPlaygroundProps) {
  const [params, setParams] = useState(defaultParams);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    setStatus(null);
    setTime(null);
    
    const startTime = performance.now();
    
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
      
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://salahsl.vercel.app';
      const url = `${baseUrl}${endpoint}${queryString}`;
      
      const response = await fetch(url, { method });
      const data = await response.json();
      
      setStatus(response.status);
      setResult(data);
    } catch (err: any) {
      setStatus(0);
      setResult({ error: 'Network failure or CORS issue.' });
    } finally {
      setTime(Math.round(performance.now() - startTime));
      setLoading(false);
    }
  };

  const updateParam = (key: string, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const fullUrl = `GET ${endpoint}${queryString}`;

  return (
    <div className="my-8 rounded-lg border border-fd-border bg-fd-card overflow-hidden flex flex-col">
      <div className="bg-fd-secondary border-b border-fd-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-fd-foreground">Try this endpoint</span>
        <div className="flex gap-2">
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${status === 200 ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
              {status}
            </span>
          )}
          {time && <span className="text-xs text-fd-muted-foreground py-0.5">{time}ms</span>}
        </div>
      </div>
      
      <div className="p-4 space-y-4 border-b border-fd-border">
        {Object.entries(defaultParams).map(([key, value]) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-mono text-fd-muted-foreground">{key}</label>
            <input
              type="text"
              value={params[key] || ''}
              onChange={(e) => updateParam(key, e.target.value)}
              className="w-full bg-fd-background border border-fd-border rounded px-3 py-1.5 text-sm text-fd-foreground focus:outline-none focus:border-fd-primary transition-colors"
              placeholder={`Enter ${key}...`}
            />
          </div>
        ))}
        
        <div className="pt-2">
          <button
            onClick={handleRun}
            disabled={loading}
            className="bg-fd-primary text-fd-primary-foreground text-sm font-medium px-4 py-1.5 rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center w-full sm:w-auto"
          >
            {loading ? 'Running...' : 'Run Request'}
          </button>
        </div>
      </div>

      <div className="bg-fd-muted p-4 flex flex-col">
        <div className="mb-2">
          <span className="text-xs text-fd-muted-foreground uppercase tracking-wider font-semibold">Request</span>
        </div>
        <pre className="text-xs font-mono text-fd-muted-foreground mb-4 bg-transparent border-0 p-0 overflow-x-auto">
          <code>{fullUrl}</code>
        </pre>
        
        <div className="mb-2">
          <span className="text-xs text-fd-muted-foreground uppercase tracking-wider font-semibold">Response</span>
        </div>
        <div className="flex-1 overflow-x-auto">
          {result ? (
            <pre className="text-sm font-mono text-fd-foreground bg-transparent border-0 p-0 m-0">
              <code>{JSON.stringify(result, null, 2)}</code>
            </pre>
          ) : (
            <div className="text-sm text-fd-muted-foreground font-mono italic">Click run to see response</div>
          )}
        </div>
      </div>
    </div>
  );
}
