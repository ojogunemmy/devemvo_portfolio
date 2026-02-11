(function () {
    const STORAGE_PREFIX = "devemco:blog:";

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(unsafe) {
        return String(unsafe)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(iso) {
        try {
            const date = new Date(iso);
            return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        } catch {
            return iso;
        }
    }

    function getUrlSlug() {
        const params = new URLSearchParams(window.location.search);
        return params.get("slug");
    }

    function getLikesState(slug) {
        const key = `${STORAGE_PREFIX}liked:${slug}`;
        return localStorage.getItem(key) === "1";
    }

    function setLikesState(slug, liked) {
        const key = `${STORAGE_PREFIX}liked:${slug}`;
        localStorage.setItem(key, liked ? "1" : "0");
    }

    function getBookmarkState(slug) {
        const key = `${STORAGE_PREFIX}bookmarked:${slug}`;
        return localStorage.getItem(key) === "1";
    }

    function setBookmarkState(slug, bookmarked) {
        const key = `${STORAGE_PREFIX}bookmarked:${slug}`;
        localStorage.setItem(key, bookmarked ? "1" : "0");
    }

    function getShareCount(slug) {
        const key = `${STORAGE_PREFIX}shared:${slug}`;
        const raw = localStorage.getItem(key);
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    }

    function incrementShareCount(slug) {
        const key = `${STORAGE_PREFIX}shared:${slug}`;
        const next = getShareCount(slug) + 1;
        localStorage.setItem(key, String(next));
        return next;
    }

    function getComments(slug) {
        const key = `${STORAGE_PREFIX}comments:${slug}`;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function setComments(slug, comments) {
        const key = `${STORAGE_PREFIX}comments:${slug}`;
        localStorage.setItem(key, JSON.stringify(comments));
    }

    function wordCountFromBlocks(blocks) {
        let count = 0;
        for (const block of blocks || []) {
            if (block.type === "p" || block.type === "h2" || block.type === "h3" || block.type === "callout") {
                count += String(block.text || "").trim().split(/\s+/).filter(Boolean).length;
            }
            if (block.type === "image") {
                const caption = String(block.caption || "").trim();
                if (caption) count += caption.split(/\s+/).filter(Boolean).length;

                const sourceLabel = String(block.source?.label || "").trim();
                if (sourceLabel) count += sourceLabel.split(/\s+/).filter(Boolean).length;
            }
            if (block.type === "ul" || block.type === "ol") {
                for (const item of block.items || []) {
                    count += String(item).trim().split(/\s+/).filter(Boolean).length;
                }
            }
            if (block.type === "code") {
                // code isn't read word-for-word; count lightly
                count += Math.ceil(String(block.code || "").length / 40);
            }
        }
        return count;
    }

    function estimateReadingMinutes(blocks) {
        const words = wordCountFromBlocks(blocks);
        const minutes = Math.max(3, Math.round(words / 220));
        return minutes;
    }

    function sortPosts(posts, mode) {
        const cloned = [...posts];
        if (mode === "oldest") {
            cloned.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        } else if (mode === "category") {
            cloned.sort((a, b) => {
                const c = (a.category?.name || "").localeCompare(b.category?.name || "");
                if (c !== 0) return c;
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });
        } else {
            cloned.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        }
        return cloned;
    }

    function getUniqueCategories(posts) {
        const map = new Map();
        for (const post of posts) {
            if (!post.category || !post.category.id) continue;
            map.set(post.category.id, post.category.name);
        }
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }

    function getPostCountsByCategory(posts) {
        const counts = new Map();
        for (const post of posts) {
            const id = post.category?.id;
            if (!id) continue;
            counts.set(id, (counts.get(id) || 0) + 1);
        }
        return counts;
    }

    function renderIndexPage() {
        const posts = window.BLOG_POSTS || [];
        const postList = $("postList");
        const categoryRow = $("categoryRow");
        const sortSelect = $("sortSelect");

        const hero = document.querySelector("header.blog-hero");
        const featuredCard = $("featuredCard");
        const featuredLink = $("featuredLink");
        const featuredSummary = $("featuredSummary");
        const featuredMeta = $("featuredMeta");
        const featuredCategory = $("featuredCategory");

        if (!postList || !categoryRow || !sortSelect) return;

        let activeCategory = "all";
        const counts = getPostCountsByCategory(posts);

        function makePill({ id, label, count }) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "blog-pill";
            btn.setAttribute("aria-pressed", id === activeCategory ? "true" : "false");
            btn.textContent = count != null ? `${label} (${count})` : label;
            btn.addEventListener("click", () => {
                activeCategory = id;
                [...categoryRow.querySelectorAll("button.blog-pill")].forEach(p => {
                    p.setAttribute("aria-pressed", p === btn ? "true" : "false");
                });
                renderList();
            });
            return btn;
        }

        function getVisiblePosts() {
            const mode = sortSelect.value;
            let visible = posts;
            if (activeCategory !== "all") {
                visible = posts.filter(p => p.category?.id === activeCategory);
            }
            return sortPosts(visible, mode);
        }

        function renderList() {
            const visible = getVisiblePosts();
            postList.innerHTML = "";

            if (!visible.length) {
                const empty = document.createElement("div");
                empty.className = "blog-muted";
                empty.textContent = "No posts in this category yet.";
                postList.appendChild(empty);
                return;
            }

            for (const post of visible) {
                const minutes = estimateReadingMinutes(post.content);
                const liked = getLikesState(post.slug);
                const comments = getComments(post.slug);
                const likeCount = (post.stats?.baseLikes || 0) + (liked ? 1 : 0);

                const card = document.createElement("article");
                card.className = "blog-post-card";

                if (post.cover?.src) {
                    const img = document.createElement("img");
                    img.className = "blog-post-cover";
                    img.src = post.cover.src;
                    img.alt = post.cover.alt || "";
                    img.loading = "lazy";
                    img.decoding = "async";
                    card.appendChild(img);
                }

                const titleLink = document.createElement("a");
                titleLink.className = "blog-post-title-link";
                titleLink.href = `./post.html?slug=${encodeURIComponent(post.slug)}`;
                titleLink.textContent = post.title;

                const excerpt = document.createElement("p");
                excerpt.className = "blog-post-excerpt";
                excerpt.textContent = post.hero?.summary || post.seo?.description || "";

                const metaRow = document.createElement("div");
                metaRow.className = "blog-meta-row";
                metaRow.innerHTML = [
                    `<span class="blog-badge">🏷️ ${escapeHtml(post.category?.name || "")}</span>`,
                    `<span class="blog-badge">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>`,
                    `<span class="blog-badge">⏱️ ${minutes} min</span>`,
                    `<span class="blog-badge">❤️ ${likeCount}</span>`,
                    `<span class="blog-badge">💬 ${comments.length}</span>`
                ].join(" ");

                card.appendChild(titleLink);
                card.appendChild(excerpt);
                card.appendChild(metaRow);
                postList.appendChild(card);
            }
        }

        // categories
        categoryRow.innerHTML = "";
        const allPill = makePill({ id: "all", label: "All", count: posts.length });
        categoryRow.appendChild(allPill);

        for (const cat of getUniqueCategories(posts)) {
            categoryRow.appendChild(makePill({ id: cat.id, label: cat.name, count: counts.get(cat.id) || 0 }));
        }

        sortSelect.addEventListener("change", renderList);
        renderList();

        // Featured / recent post flipper in the hero
        if (featuredCard && featuredLink && featuredSummary && featuredMeta && featuredCategory && hero && posts.length) {
            const recent = sortPosts(posts, "newest").slice(0, Math.min(6, posts.length));
            let idx = 0;
            let timer = null;

            function applyFeatured(post) {
                featuredCategory.textContent = post.category?.name || "";
                featuredLink.textContent = post.title;
                featuredLink.href = `./post.html?slug=${encodeURIComponent(post.slug)}`;
                featuredSummary.textContent = post.hero?.summary || post.seo?.description || "";

                const minutes = estimateReadingMinutes(post.content);
                featuredMeta.innerHTML = [
                    `<span class=\"blog-featured-pill\">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>`,
                    `<span class=\"blog-featured-pill\">⏱️ ${minutes} min</span>`,
                    `<span class=\"blog-featured-pill\">🏷️ ${escapeHtml(post.category?.name || "")}</span>`
                ].join(" ");

                if (post.cover?.src) {
                    hero.style.setProperty("--blog-hero-cover", `url('${post.cover.src}')`);
                } else {
                    hero.style.setProperty("--blog-hero-cover", "none");
                }
            }

            function flipNext() {
                if (document.visibilityState === "hidden") return;
                if (!recent.length) return;

                featuredCard.classList.add("is-flipping");
                window.setTimeout(() => {
                    idx = (idx + 1) % recent.length;
                    applyFeatured(recent[idx]);
                    featuredCard.classList.remove("is-flipping");
                }, 260);
            }

            applyFeatured(recent[idx]);
            timer = window.setInterval(flipNext, 6500);

            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "hidden") return;
                // On return, refresh the current state.
                applyFeatured(recent[idx]);
            });

            // Stop flipping if user clicks the featured card (navigation will happen anyway)
            featuredCard.addEventListener("click", () => {
                if (timer) window.clearInterval(timer);
            });
        }
    }

    function renderBlocks(container, blocks) {
        container.innerHTML = "";

        for (const block of blocks || []) {
            if (block.type === "p") {
                const p = document.createElement("p");
                p.textContent = block.text || "";
                container.appendChild(p);
                continue;
            }

            if (block.type === "h2") {
                const h2 = document.createElement("h2");
                h2.textContent = block.text || "";
                container.appendChild(h2);
                continue;
            }

            if (block.type === "h3") {
                const h3 = document.createElement("h3");
                h3.textContent = block.text || "";
                container.appendChild(h3);
                continue;
            }

            if (block.type === "ul" || block.type === "ol") {
                const list = document.createElement(block.type);
                for (const item of block.items || []) {
                    const li = document.createElement("li");
                    li.textContent = item;
                    list.appendChild(li);
                }
                container.appendChild(list);
                continue;
            }

            if (block.type === "callout") {
                const div = document.createElement("div");
                div.className = "blog-callout";
                div.textContent = block.text || "";
                container.appendChild(div);
                continue;
            }

            if (block.type === "code") {
                const pre = document.createElement("pre");
                pre.className = "blog-code";

                const code = document.createElement("code");
                if (block.language) {
                    code.setAttribute("data-language", block.language);
                }
                code.textContent = block.code || "";

                pre.appendChild(code);
                container.appendChild(pre);
                continue;
            }

            if (block.type === "image") {
                const figure = document.createElement("figure");
                figure.className = "blog-figure";

                const img = document.createElement("img");
                img.className = "blog-inline-image";
                img.src = block.src || "";
                img.alt = block.alt || "";
                img.loading = "lazy";
                img.decoding = "async";
                figure.appendChild(img);

                const captionText = String(block.caption || "").trim();
                const sourceLabel = String(block.source?.label || "").trim();
                const sourceUrl = String(block.source?.url || "").trim();

                if (captionText || sourceLabel) {
                    const figcaption = document.createElement("figcaption");
                    figcaption.className = "blog-figcaption";

                    if (captionText) {
                        const cap = document.createElement("span");
                        cap.className = "blog-caption";
                        cap.textContent = captionText;
                        figcaption.appendChild(cap);
                    }

                    if (sourceLabel) {
                        const srcWrap = document.createElement("span");
                        srcWrap.className = "blog-source";

                        const prefix = document.createElement("span");
                        prefix.textContent = captionText ? " — Source: " : "Source: ";
                        srcWrap.appendChild(prefix);

                        if (sourceUrl) {
                            const a = document.createElement("a");
                            a.href = sourceUrl;
                            a.target = "_blank";
                            a.rel = "noopener noreferrer";
                            a.textContent = sourceLabel;
                            srcWrap.appendChild(a);
                        } else {
                            const t = document.createElement("span");
                            t.textContent = sourceLabel;
                            srcWrap.appendChild(t);
                        }

                        figcaption.appendChild(srcWrap);
                    }

                    figure.appendChild(figcaption);
                }

                container.appendChild(figure);
                continue;
            }
        }
    }

    function updateSeoForPost(post) {
        const title = `${post.title} | Dev Emco`;
        document.title = title;

        const description = post.seo?.description || post.hero?.summary || "";

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", description);

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute("content", description);

        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) {
            if (post.cover?.src) {
                ogImg.setAttribute("content", new URL(post.cover.src, window.location.origin).toString());
            } else {
                ogImg.setAttribute("content", "");
            }
        }

        const canonicalHref = window.location.href;

        const ld = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description,
            image: post.cover?.src ? [new URL(post.cover.src, window.location.origin).toString()] : undefined,
            author: {
                "@type": "Person",
                name: post.author?.name || "Dev Emco"
            },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            mainEntityOfPage: canonicalHref,
            keywords: (post.seo?.keywords || []).join(", ")
        };

        const ldNode = document.getElementById("ldJson");
        if (ldNode) {
            const cleaned = JSON.parse(JSON.stringify(ld));
            ldNode.textContent = JSON.stringify(cleaned);
        }
    }

    function renderPostPage() {
        const slug = getUrlSlug();
        const posts = window.BLOG_POSTS || [];

        const postTitle = $("postTitle");
        const postSummary = $("postSummary");
        const postMeta = $("postMeta");
        const postBody = $("postBody");

        const likeBtn = $("likeBtn");
        const bookmarkBtn = $("bookmarkBtn");
        const shareBtn = $("shareBtn");
        const copyLinkBtn = $("copyLinkBtn");
        const engagementCounts = $("engagementCounts");

        const commentForm = $("commentForm");
        const commentName = $("commentName");
        const commentText = $("commentText");
        const commentHelp = $("commentHelp");
        const commentList = $("commentList");
        const commentError = $("commentError");

        const postHeader = document.querySelector(".blog-post-header");

        if (!postTitle || !postBody) return;

        const post = posts.find(p => p.slug === slug);
        if (!post) {
            postTitle.textContent = "Post not found";
            if (postSummary) postSummary.textContent = "The link may be wrong or the post was renamed.";
            return;
        }

        updateSeoForPost(post);

        const minutes = estimateReadingMinutes(post.content);
        postTitle.textContent = post.title;
        if (postSummary) postSummary.textContent = post.hero?.summary || "";

        if (postHeader) {
            const existing = postHeader.querySelector("img.blog-cover");
            if (existing) existing.remove();

            if (post.cover?.src) {
                const img = document.createElement("img");
                img.className = "blog-cover";
                img.src = post.cover.src;
                img.alt = post.cover.alt || "";
                img.loading = "eager";
                img.decoding = "async";

                postHeader.insertBefore(img, postHeader.firstChild);
            }
        }

        if (postMeta) {
            postMeta.innerHTML = [
                `<span class="blog-badge">🏷️ ${escapeHtml(post.category?.name || "")}</span>`,
                `<span class="blog-badge">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>`,
                `<span class="blog-badge">⏱️ ${minutes} min read</span>`,
                `<span class="blog-badge">✍️ ${escapeHtml(post.author?.name || "")}</span>`
            ].join(" ");
        }

        renderBlocks(postBody, post.content);

        function renderEngagement() {
            const liked = getLikesState(post.slug);
            const bookmarked = getBookmarkState(post.slug);
            const comments = getComments(post.slug);
            const shareAdds = getShareCount(post.slug);

            const likeCount = (post.stats?.baseLikes || 0) + (liked ? 1 : 0);
            const shareCount = (post.stats?.baseShares || 0) + shareAdds;

            if (likeBtn) {
                likeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
                likeBtn.textContent = liked ? "Liked" : "Like";
            }

            if (bookmarkBtn) {
                bookmarkBtn.setAttribute("aria-pressed", bookmarked ? "true" : "false");
                bookmarkBtn.textContent = bookmarked ? "Bookmarked" : "Bookmark";
            }

            if (engagementCounts) {
                engagementCounts.innerHTML = [
                    `<span class="blog-count-pill">❤️ ${likeCount}</span>`,
                    `<span class="blog-count-pill">💬 ${comments.length}</span>`,
                    `<span class="blog-count-pill">🔁 ${shareCount}</span>`
                ].join(" ");
            }

            if (commentList) {
                commentList.innerHTML = "";
                if (!comments.length) {
                    const empty = document.createElement("p");
                    empty.className = "blog-muted";
                    empty.textContent = "No comments yet. Be the first to add a useful note or question.";
                    commentList.appendChild(empty);
                } else {
                    for (const c of comments) {
                        const wrap = document.createElement("div");
                        wrap.className = "blog-comment";

                        const head = document.createElement("div");
                        head.className = "blog-comment-head";

                        const name = document.createElement("div");
                        name.className = "blog-comment-name";
                        name.textContent = c.name || "Anonymous";

                        const date = document.createElement("div");
                        date.className = "blog-comment-date";
                        date.textContent = formatDate(c.createdAt);

                        head.appendChild(name);
                        head.appendChild(date);

                        const text = document.createElement("div");
                        text.className = "blog-comment-text";
                        text.textContent = c.text || "";

                        wrap.appendChild(head);
                        wrap.appendChild(text);
                        commentList.appendChild(wrap);
                    }
                }
            }
        }

        if (likeBtn) {
            likeBtn.addEventListener("click", () => {
                const liked = getLikesState(post.slug);
                setLikesState(post.slug, !liked);
                renderEngagement();
            });
        }

        if (bookmarkBtn) {
            bookmarkBtn.addEventListener("click", () => {
                const bookmarked = getBookmarkState(post.slug);
                setBookmarkState(post.slug, !bookmarked);
                renderEngagement();
            });
        }

        function getShareUrl() {
            return window.location.href;
        }

        async function copyToClipboard(text) {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    return true;
                }
            } catch {
                // ignore
            }

            // fallback
            try {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.style.position = "absolute";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                return true;
            } catch {
                return false;
            }
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener("click", async () => {
                const ok = await copyToClipboard(getShareUrl());
                copyLinkBtn.textContent = ok ? "Copied" : "Copy failed";
                setTimeout(() => (copyLinkBtn.textContent = "Copy link"), 1200);
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener("click", async () => {
                const shareData = {
                    title: post.title,
                    text: post.seo?.description || post.hero?.summary || "",
                    url: getShareUrl()
                };

                // Track share intent locally (this is per-browser, not global analytics).
                incrementShareCount(post.slug);
                renderEngagement();

                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                        return;
                    } catch {
                        // user cancelled or not allowed
                    }
                }

                const ok = await copyToClipboard(shareData.url);
                shareBtn.textContent = ok ? "Link copied" : "Copy failed";
                setTimeout(() => (shareBtn.textContent = "Share"), 1200);
            });
        }

        if (commentText && commentHelp) {
            const updateHelp = () => {
                commentHelp.textContent = `${commentText.value.length}/1200`;
            };
            commentText.addEventListener("input", updateHelp);
            updateHelp();
        }

        if (commentForm) {
            commentForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (commentError) commentError.textContent = "";

                const rawName = (commentName?.value || "").trim();
                const rawText = (commentText?.value || "").trim();

                const name = rawName.length ? rawName : "Anonymous";

                if (rawText.length < 12) {
                    if (commentError) commentError.textContent = "Comment is too short. Add more context (at least 12 characters).";
                    return;
                }

                if (rawText.length > 1200) {
                    if (commentError) commentError.textContent = "Comment is too long (max 1200 characters).";
                    return;
                }

                const comments = getComments(post.slug);
                comments.unshift({
                    id: `c_${Math.random().toString(16).slice(2)}`,
                    name,
                    text: rawText,
                    createdAt: new Date().toISOString()
                });

                setComments(post.slug, comments);
                if (commentText) commentText.value = "";
                if (commentName && !rawName.length) commentName.value = "";
                if (commentHelp) commentHelp.textContent = "0/1200";
                renderEngagement();
            });
        }

        renderEngagement();
    }

    document.addEventListener("DOMContentLoaded", () => {
        // blog index
        renderIndexPage();
        // post page
        renderPostPage();
    });
})();
