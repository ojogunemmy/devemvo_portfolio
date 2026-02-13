/* Blog content + metadata.
   This is intentionally structured (not just raw HTML) so you can:
   - render to HTML
   - generate RSS later
   - validate schema
   - migrate to a backend/CMS without rewriting content
*/

(function () {
    const CUSTOM_POSTS_KEY = "devemco:blog:customPosts";

    function loadCustomPosts() {
        try {
            const raw = localStorage.getItem(CUSTOM_POSTS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function isValidPostShape(post) {
        return post && typeof post === "object" && typeof post.slug === "string" && post.slug.trim().length;
    }

    const posts = [
        {
            id: "post_001",
            slug: "category-first-blog-platform-without-cms",
            title: "Build a Category-First Blog Platform (Without a CMS): A Production-Minded Blueprint",
            cover: {
                src: "../public/blog-covers/category-first-blog-platform-without-cms.svg",
                alt: "Category-first blog blueprint cover"
            },
            category: {
                id: "architecture",
                name: "Architecture"
            },
            tags: ["seo", "information-architecture", "frontend", "portfolio", "content-model"],
            author: {
                name: "Dev Emco",
                title: "Software Engineer"
            },
            publishedAt: "2026-02-10T09:00:00.000Z",
            updatedAt: "2026-02-10T09:00:00.000Z",
            seo: {
                description: "A practical, category-first content model and front-end implementation plan for a portfolio blog — including edge cases, common mistakes, and checklists you can ship with.",
                keywords: [
                    "category based blog",
                    "content model",
                    "portfolio blog",
                    "blog architecture",
                    "seo for static sites"
                ]
            },
            hero: {
                kicker: "Architecture",
                summary: "If your blog is ‘just a page’, it will collapse the moment you have 20 posts. This blueprint shows how to structure content around categories, build durable URLs, and add engagement features without painting yourself into a corner."
            },
            stats: {
                baseLikes: 47,
                baseShares: 18
            },
            content: [
                {
                    type: "p",
                    text: "Most portfolio blogs die the same way: you publish three posts, feel productive, then quietly stop — not because you ran out of ideas, but because posting becomes friction. Links break, categories drift, older posts disappear, and ‘search later’ turns into ‘never’."
                },
                {
                    type: "p",
                    text: "A category-first blog fixes that by turning your content into a system: predictable URLs, consistent navigation, reusable templates, and a data model that scales from 5 posts to 500 without a rewrite."
                },
                {
                    type: "image",
                    src: "../public/blog-images/category-taxonomy-map.svg",
                    alt: "A small, stable category taxonomy branching into clear content areas.",
                    caption: "A category-first blog starts with a small, stable taxonomy that readers can actually navigate.",
                    source: { label: "Dev Emco (SVG)" }
                },
                {
                    type: "callout",
                    text: "This post is opinionated on purpose: it’s what I’ve seen work when you want professional results without adopting a full CMS on day one."
                },

                { type: "h2", text: "The real problem: posts are easy, information architecture isn’t" },
                {
                    type: "p",
                    text: "Writing a post is a single event. Maintaining a blog is a long-running system. The system breaks when you treat categories as decoration instead of navigation, and when you store content as ad-hoc HTML that can’t be repurposed."
                },
                {
                    type: "p",
                    text: "A professional blog needs at least four invariants: (1) stable identifiers (slugs), (2) a clear category taxonomy, (3) a content model that can render to multiple targets (web, RSS, email), and (4) a consistent engagement layer (likes/comments/share) that doesn’t corrupt the content itself."
                },

                { type: "h2", text: "Category-first design: what it means (and why it works)" },
                { type: "h3", text: "Categories are constraints, not labels" },
                {
                    type: "p",
                    text: "A category is a promise to the reader: ‘if you liked this, here’s more like it.’ That only works when categories are few, stable, and meaningfully different. Too many categories turns navigation into a junk drawer. Too few categories becomes vague and unhelpful."
                },
                {
                    type: "p",
                    text: "Why this works: categories reduce the reader’s search cost. Humans don’t ‘remember titles’; they remember themes. Categorization is how you turn one-time visitors into returning readers." 
                },
                { type: "h3", text: "A practical category taxonomy that scales" },
                {
                    type: "p",
                    text: "For a portfolio blog, I’d start with 3–6 categories max. Examples: Architecture, Delivery, Backend, Frontend, IoT/Real-Time, Career. Keep ‘Career’ separate so it doesn’t dilute your technical posts."
                },
                {
                    type: "ul",
                    items: [
                        "Category names should be nouns (Architecture, Delivery), not vague verbs (Building, Making).",
                        "Every post must have exactly one primary category to avoid ‘multi-home’ confusion.",
                        "Tags can be many; categories should be few. Tags are for search; categories are for navigation."
                    ]
                },

                { type: "h2", text: "A post data model that won’t betray you later" },
                {
                    type: "p",
                    text: "The fastest way to sabotage future improvements is to store posts as unstructured blobs. When content is just HTML, you can’t validate it, you can’t generate consistent previews, and you can’t compute useful metadata (reading time, headings, excerpts) reliably."
                },
                {
                    type: "p",
                    text: "Instead, treat a post as a typed document: metadata + content blocks. That’s exactly what this project’s blog does. You write blocks (paragraphs, H2/H3, lists, callouts, code) and the renderer turns it into semantic HTML." 
                },
                {
                    type: "image",
                    src: "../public/blog-images/content-model-blocks.svg",
                    alt: "A card showing typed content blocks like paragraphs, headings, lists, code, and images.",
                    caption: "Typed blocks make it easy to render consistent HTML and extend your content safely over time.",
                    source: { label: "Dev Emco (SVG)" }
                },
                {
                    type: "code",
                    language: "js",
                    code: "// High-level structure (see POST_SCHEMA.md for the detailed schema)\n{\n  id, slug, title, category, tags, author, publishedAt, updatedAt,\n  seo: { description, keywords },\n  hero: { kicker, summary },\n  stats: { baseLikes, baseShares },\n  content: [ { type: 'p'|'h2'|'h3'|'ul'|'ol'|'code'|'callout', ... } ]\n}"
                },

                { type: "h2", text: "Engagement: likes, comments, share — without ruining UX" },
                { type: "h3", text: "Why engagement works (when it’s done right)" },
                {
                    type: "p",
                    text: "Engagement isn’t vanity — it’s feedback. A like is a low-friction ‘this helped’. A comment is higher-friction ‘here’s what happened in my case’. Sharing is proof the post delivered enough value to risk social capital." 
                },
                {
                    type: "p",
                    text: "But engagement becomes toxic when it’s noisy: popups, modals, forced logins, or dark patterns. For a portfolio blog, the best engagement UX is subtle: buttons near the top, clear counts, and a comment form at the end." 
                },
                { type: "h3", text: "Edge cases you must handle" },
                {
                    type: "ul",
                    items: [
                        "Multiple likes: a single user should toggle like, not inflate counts by clicking repeatedly.",
                        "Empty/low-quality comments: enforce minimum length and basic trimming.",
                        "Very long comments: set limits to keep layouts stable.",
                        "Share on unsupported browsers: provide a ‘copy link’ fallback when Web Share API isn’t available."
                    ]
                },

                { type: "h2", text: "Common mistakes (and how to avoid them)" },
                {
                    type: "ol",
                    items: [
                        "Mistake: treating the slug as the title. Fix: slug is an identifier; title can evolve without breaking URLs.",
                        "Mistake: category explosion. Fix: cap categories; use tags for specificity.",
                        "Mistake: publishing without an excerpt. Fix: store a summary (hero.summary) separate from content.",
                        "Mistake: SEO ‘keywords’ stuffed into copy. Fix: write naturally, then ensure your title + description are accurate and specific.",
                        "Mistake: no update policy. Fix: track updatedAt and be honest when content changes materially."
                    ]
                },

                { type: "h2", text: "Actionable checklist: ship a category-first blog in a weekend" },
                {
                    type: "ul",
                    items: [
                        "Pick 3–6 categories and write one sentence for each describing what belongs there.",
                        "Define a post schema (metadata + blocks) and commit to it.",
                        "Create durable URLs: /blog/post.html?slug=... (or /blog/{slug}/ if you later go static-per-post).",
                        "Render semantic HTML: H2/H3 hierarchy, real lists, and code blocks.",
                        "Add engagement: like toggle, comment form, share + copy link.",
                        "Add SEO basics: meta description + OG tags + JSON-LD per post.",
                        "Test edge cases: missing slug, unknown slug, empty comments, long comments, no Web Share API."
                    ]
                },

                { type: "h2", text: "Conclusion: build content like you build software" },
                {
                    type: "p",
                    text: "A portfolio blog isn’t a diary — it’s a living system. If you treat categories as navigation, slugs as durable identifiers, and posts as typed documents, you’ll stop fighting your own tooling and start publishing consistently."
                },
                {
                    type: "p",
                    text: "Next steps: add your next two categories, publish one post per category, and keep the structure stable for 30 days. Consistency beats cleverness — and a clean content model makes consistency easy."
                }
            ]
        },
        {
            id: "post_002",
            slug: "real-time-iot-data-pipelines-edge-cases",
            title: "Real-Time IoT Data Pipelines: Edge Cases That Break ‘It Works on My Desk’",
            cover: {
                src: "../public/blog-covers/real-time-iot-data-pipelines-edge-cases.svg",
                alt: "Real-time IoT edge cases cover"
            },
            category: {
                id: "iot-realtime",
                name: "IoT & Real-Time"
            },
            tags: ["mqtt", "websocket", "telemetry", "reliability", "backpressure"],
            author: {
                name: "Dev Emco",
                title: "Software Engineer"
            },
            publishedAt: "2026-02-10T09:05:00.000Z",
            updatedAt: "2026-02-10T09:05:00.000Z",
            seo: {
                description: "A practical guide to real-time IoT telemetry: ordering, retries, backpressure, offline buffers, and the common mistakes that show up in production.",
                keywords: [
                    "iot telemetry",
                    "real time pipeline",
                    "mqtt edge cases",
                    "backpressure",
                    "offline buffering"
                ]
            },
            hero: {
                kicker: "IoT & Real-Time",
                summary: "The demo works. Then production happens: flaky networks, duplicate messages, clock drift, and spikes that flatten your dashboard. Here’s how to design for the failures that actually occur."
            },
            stats: {
                baseLikes: 62,
                baseShares: 29
            },
            content: [
                {
                    type: "p",
                    text: "If you’ve ever said ‘the device is sending data, so why is the dashboard blank?’, you’ve already met the gap between a working prototype and a reliable real-time system."
                },
                {
                    type: "p",
                    text: "Real-time IoT isn’t hard because of the happy path. It’s hard because the unhappy paths are the normal path: packet loss, duplicates, delayed bursts, and clients reconnecting in the worst possible order." 
                },

                {
                    type: "image",
                    src: "../public/blog-images/iot-pipeline-diagram.svg",
                    alt: "A simple IoT pipeline diagram showing Devices → Ingest → Stream → Serve, with reliability edge cases.",
                    caption: "A minimal real-time pipeline — and the edge cases you must design for from day one.",
                    source: { label: "Dev Emco (SVG)" }
                },

                { type: "h2", text: "Why production telemetry fails (even when the code is correct)" },
                {
                    type: "p",
                    text: "Most failures come from implicit assumptions: ‘messages arrive once’, ‘timestamps are trustworthy’, ‘clients are always online’, ‘throughput is stable’. None of these assumptions hold in the field." 
                },

                { type: "h2", text: "A reliability framework: the 4 guarantees you must choose" },
                { type: "h3", text: "1) Delivery semantics" },
                {
                    type: "p",
                    text: "Pick what you can guarantee: at-most-once, at-least-once, or exactly-once. In practice, many IoT systems are at-least-once — which means duplicates are normal and your consumers must be idempotent." 
                },
                { type: "h3", text: "2) Ordering" },
                {
                    type: "p",
                    text: "Ordering is a feature, not a default. A reconnection burst can arrive out of order. If you need ordering, implement sequence numbers per device and handle gaps explicitly." 
                },
                { type: "h3", text: "3) Time" },
                {
                    type: "p",
                    text: "Device clocks drift. Relying purely on device timestamps can reorder events and break charts. A common approach: store both deviceTime and serverIngestTime, and decide which one powers which view." 
                },
                { type: "h3", text: "4) Backpressure" },
                {
                    type: "p",
                    text: "When data spikes, something must slow down. If your UI tries to render every event, it will lock up. You need sampling, batching, or windowed aggregation." 
                },

                { type: "h2", text: "Real-world example: MQTT + WebSocket dashboard" },
                {
                    type: "p",
                    text: "A common architecture: devices publish telemetry via MQTT, a backend normalizes and stores it, and a dashboard consumes updates via WebSockets. The tricky part isn’t wiring it — it’s making it stable." 
                },
                {
                    type: "ul",
                    items: [
                        "Normalize payloads at the edge: don’t let every device firmware invent a new schema.",
                        "Enforce idempotency keys: deviceId + seq (or deviceId + sampleTime + metricName).",
                        "Use bounded buffers: drop old updates rather than OOM-ing your server.",
                        "Aggregate for UI: send 1 update per second, not 200 per second." 
                    ]
                },

                { type: "h2", text: "Common mistakes" },
                {
                    type: "ol",
                    items: [
                        "Mistake: assuming reconnect = resume. Fix: treat reconnect as a burst; handle duplicates and reordering.",
                        "Mistake: pushing raw telemetry straight to UI. Fix: aggregate and throttle.",
                        "Mistake: no offline strategy. Fix: store-and-forward with explicit bounds.",
                        "Mistake: using ‘latest value’ everywhere. Fix: store history; compute latest as a view.",
                        "Mistake: ignoring payload versioning. Fix: add schemaVersion and migrate on ingest." 
                    ]
                },

                { type: "h2", text: "Actionable checklist" },
                {
                    type: "ul",
                    items: [
                        "Add per-device sequence numbers and persist the last processed sequence.",
                        "Store both deviceTime and serverIngestTime.",
                        "Make consumers idempotent by design.",
                        "Throttle dashboard updates (batch per 250–1000ms).",
                        "Test with chaos: drop 10% packets, reorder bursts, simulate 5-minute offline periods." 
                    ]
                },

                { type: "h2", text: "Conclusion" },
                {
                    type: "p",
                    text: "The fastest way to build reliable IoT is to assume the network is lying — because it is. Design for duplicates, delays, and spikes upfront, and your system will feel ‘boringly stable’ in production." 
                }
            ]
        }
    ];

    // Merge locally-created posts (from the Manage page) into the runtime list.
    // These are stored per-browser (no backend).
    const baseSlugs = new Set(posts.map(p => p.slug));
    for (const custom of loadCustomPosts()) {
        if (!isValidPostShape(custom)) continue;
        const slug = String(custom.slug).trim();
        if (!slug || baseSlugs.has(slug)) continue;
        baseSlugs.add(slug);
        posts.push({ ...custom, __custom: true });
    }

    window.BLOG_POSTS = posts;
})();
