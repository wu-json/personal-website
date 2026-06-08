import { generateFeed } from 'src/lib/rss';

export const dynamic = 'force-static';

export async function GET() {
  const rss = await generateFeed();
  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
