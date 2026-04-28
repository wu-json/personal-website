---
status: implemented
---

# RSS feed shows duplicate/stretched images in some viewers

**Affected**: `src/plugins/rss.ts` — Signals RSS feed (`/signals/feed.xml`)
**Viewer**: rss.app (confirmed), likely other RSS-to-web renderers

## Symptoms

In rss.app and similar RSS viewers, signal entries with images display **two copies** of each image:

1. The first renders correctly (from the inline `<img>` in `<content:encoded>` HTML).
2. The second is a **stretched/distorted** version — the viewer extracts the first image as a hero/featured image and renders it without respecting the original aspect ratio.

Additionally, when `<description>` is empty (image-only posts like Chinatown Wars), some viewers fall back to scraping the linked page for content, which pulls the image from the site's `<img>` markup and renders it stretched.

## Root cause

**Confirmed pattern** (backed by SoCast Digital's [KB article on duplicate RSS images](https://support.socastdigital.com/portal/en/kb/articles/why-are-there-duplicate-images-appearing-in-my-blog-posts-from-3rd-party-rss-feeds) and FreshRSS [#1668](https://github.com/FreshRSS/FreshRSS/issues/1668)):

RSS-to-web renderers like rss.app follow this logic:
1. Check if the feed item has a dedicated featured image (e.g., `<media:content>`, `<enclosure>`).
2. If **not**, extract the first `<img>` from the content body and promote it to a "featured" or "hero" image.
3. **Also** render the full content body inline — which still contains that same `<img>`.

Result: the image appears twice — once properly sized in the content flow, and once as a separately-styled hero image (often stretched to fill a container). Wrapping images in `<figure>` doesn't help; the extraction logic scans for any `<img>` tag regardless of parent element.

**Two separate issues in the RSS feed output:**

1. **Image duplication**: `<img>` tags in `<content:encoded>` (or `<description>`, regardless of which field holds the HTML) trigger the extract-and-render-duplicate behavior.

2. **Empty `<description>` fallback**: For image-only signal posts (body contains just an `<img>` tag), `plainExcerpt()` returned an empty string after stripping the image. Some RSS viewers treat an empty `<description>` as a signal to scrape the linked page for content, pulling the image from the site and rendering it poorly.

## Experiments

| Test | What changed | Result |
|------|-------------|--------|
| 1 | Move HTML to `<description>`, remove `<content:encoded>` | Still duplicated |
| 2 | Strip `<img>` from HTML, remove `<content:encoded>` | Text posts fixed; image-only posts still broken (empty description → page scrape) |
| 3 | Plain-text `<description>` + `<content:encoded>` with images | Duplicated on all image posts |
| 4 | Strip `<img>` from both + never-empty `<description>` | **All fixed** |
| 5 | Wrap `<img>` in `<figure>` + never-empty `<description>` | Still duplicated — rss.app scans any `<img>`, parent doesn't matter |

## Fix

Two changes in `src/plugins/rss.ts`:

1. **Strip `<img>` tags** from the HTML that goes into `<content:encoded>`. The image is still accessible by clicking through to the signal page — the RSS feed just won't embed it inline, avoiding viewer-side duplication.

2. **Never emit an empty `<description>`**. Fall back to the signal title, then to the ID bracket `[NNN]`, so viewers never trigger page-scraping behavior.
