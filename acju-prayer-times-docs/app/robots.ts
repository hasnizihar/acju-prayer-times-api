import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://salahsl.vercel.app';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/guide/',
      disallow: '/api/',
    },
    sitemap: `${url}/guide/sitemap.xml`,
  };
}
