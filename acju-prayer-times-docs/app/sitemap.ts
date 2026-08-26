import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://salahsl.vercel.app';
  // Next.js automatically prepends the basePath to URLs in the sitemap if configured in next.config.js,
  // but just to be safe and deterministic, we ensure paths are absolute.
  const basePath = '/guide';

  return [
    {
      url: `${url}${basePath}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: `${url}${basePath}${page.url}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
