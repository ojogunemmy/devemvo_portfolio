# Blog Post Data Structure (Schema)

This blog is **category-first** and **schema-driven**. Posts live in `blog/posts.js` as structured objects.

The goal of this model is to keep:
- URLs stable (`slug`)
- categories navigable (few, meaningful)
- content reusable (render to HTML now; RSS/email later)
- engagement separate from content (likes/comments/bookmarks are stored in `localStorage`)

## Post (top-level)

```ts
type BlogPost = {
  id: string;                 // stable unique id (internal)
  slug: string;               // stable URL identifier (do NOT change lightly)

  title: string;

  cover?: {
    src: string;              // image URL/path (recommended: under /public/blog-covers/)
    alt: string;              // meaningful alt text
  };

  category: {
    id: string;               // stable identifier, e.g. "architecture"
    name: string;             // human-friendly label, e.g. "Architecture"
  };

  tags: string[];             // many allowed; used for future search/RSS grouping

  author: {
    name: string;
    title?: string;
  };

  publishedAt: string;        // ISO datetime
  updatedAt?: string;         // ISO datetime

  seo: {
    description: string;      // used in meta description + OG
    keywords?: string[];      // optional; keep it honest and specific
  };

  hero?: {
    kicker?: string;          // short label shown near the top
    summary: string;          // excerpt/lede used in list cards + post header
  };

  stats?: {
    baseLikes?: number;       // displayed likes = baseLikes + (viewerLikeToggle ? 1 : 0)
    baseShares?: number;      // simple baseline; share events are not persisted
  };

  content: ContentBlock[];    // typed blocks rendered to semantic HTML
};
```

## Content blocks

Posts are rendered from a small set of block types.

```ts
type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "code"; language?: string; code: string }
  | {
      type: "image";
      src: string;              // image URL/path
      alt?: string;             // for accessibility (recommended)
      caption?: string;         // short caption shown under the image
      source?: {
        label: string;          // e.g. "Unsplash" or "Company diagram"
        url?: string;           // optional link (opens in new tab)
      };
    };

// Example
// {
//   type: "image",
//   src: "/public/blog-images/pipeline.png",
//   alt: "Telemetry pipeline diagram",
//   caption: "A minimal pipeline that still survives retries and backpressure.",
//   source: { label: "Internal diagram", url: "https://example.com" }
// }
```

## Engagement storage (client-side)

Engagement is intentionally not embedded into the post objects.

Keys (in `localStorage`):
- `devemco:blog:liked:<slug>` → `"1" | "0"`
- `devemco:blog:bookmarked:<slug>` → `"1" | "0"`
- `devemco:blog:comments:<slug>` → `Comment[]` JSON
- `devemco:blog:shared:<slug>` → integer count (number of share clicks in this browser)

```ts
type Comment = {
  id: string;
  name: string;
  text: string;
  createdAt: string; // ISO datetime
};
```

## URL structure

- Blog home: `blog/`
- Post page: `blog/post.html?slug=<slug>`

## Extending safely

If you later add a backend or CMS, keep `slug` stable and preserve this model:
- metadata stays metadata
- content stays structured
- engagement becomes server-side (optional) without rewriting posts
