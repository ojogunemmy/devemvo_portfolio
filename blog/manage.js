(function () {
    const STORAGE_PREFIX = "devemco:blog:";
    const CUSTOM_POSTS_KEY = "devemco:blog:customPosts";

    let editingSlug = null;

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

    function getKey(kind, slug) {
        return `${STORAGE_PREFIX}${kind}:${slug}`;
    }

    function getBool(kind, slug) {
        return localStorage.getItem(getKey(kind, slug)) === "1";
    }

    function setBool(kind, slug, value) {
        localStorage.setItem(getKey(kind, slug), value ? "1" : "0");
    }

    function getNumber(kind, slug) {
        const raw = localStorage.getItem(getKey(kind, slug));
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    }

    function setNumber(kind, slug, value) {
        localStorage.setItem(getKey(kind, slug), String(Math.max(0, Math.floor(Number(value) || 0))));
    }

    function getComments(slug) {
        const key = getKey("comments", slug);
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
        localStorage.setItem(getKey("comments", slug), JSON.stringify(comments));
    }

    function listInteractionKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.sort();
        return keys;
    }

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

    function saveCustomPosts(posts) {
        localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(posts));
    }

    function prettyJson(value) {
        return JSON.stringify(value, null, 2);
    }

    function stripRuntimeFields(post) {
        if (!post || typeof post !== "object") return post;
        const { __custom, ...rest } = post;
        return rest;
    }

    function toSlug(raw) {
        return String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/['"]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 90);
    }

    function titleCaseFromId(id) {
        return String(id || "")
            .trim()
            .replace(/[-_]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }

    function normalizeDraftToPost(draft, existingSlugs, opts) {
        if (!draft || typeof draft !== "object") throw new Error("Draft must be a JSON object.");

        const mustKeepSlug = String(opts?.mustKeepSlug || "").trim();

        const slug = toSlug(draft.slug);
        if (!slug) throw new Error("Missing or invalid 'slug'.");
        if (mustKeepSlug && slug !== mustKeepSlug) {
            throw new Error(`Slug must remain '${mustKeepSlug}' while editing.`);
        }
        if (!mustKeepSlug && existingSlugs.has(slug)) throw new Error(`Slug already exists: ${slug}`);

        const title = String(draft.title || "").trim();
        if (!title) throw new Error("Missing 'title'.");

        const categoryId = String(draft.category?.id || "").trim();
        if (!categoryId) throw new Error("Missing 'category.id'.");
        const categoryName = String(draft.category?.name || titleCaseFromId(categoryId)).trim();
        if (!categoryName) throw new Error("Missing 'category.name'.");

        const authorName = String(draft.author?.name || "").trim();
        if (!authorName) throw new Error("Missing 'author.name'.");
        const authorTitle = String(draft.author?.title || "").trim();

        const publishedAt = String(draft.publishedAt || new Date().toISOString()).trim();
        if (!publishedAt) throw new Error("Missing 'publishedAt'.");

        const seoDescription = String(draft.seo?.description || "").trim();
        if (!seoDescription) throw new Error("Missing 'seo.description'.");

        const blocks = draft.content;
        if (!Array.isArray(blocks) || !blocks.length) throw new Error("Missing 'content' (must be a non-empty array of blocks).\nSee POST_SCHEMA.md.");

        const id = String(draft.id || `post_${Date.now()}`);
        const tags = Array.isArray(draft.tags) ? draft.tags.map(t => String(t).trim()).filter(Boolean) : [];

        const coverSrc = String(draft.cover?.src || "").trim();
        const coverAlt = String(draft.cover?.alt || "").trim();
        const cover = coverSrc ? { src: coverSrc, alt: coverAlt } : undefined;

        const heroSummary = String(draft.hero?.summary || "").trim();
        const heroKicker = String(draft.hero?.kicker || "").trim();
        const hero = heroSummary ? { kicker: heroKicker || undefined, summary: heroSummary } : undefined;

        const baseLikes = Number(draft.stats?.baseLikes || 0);
        const baseShares = Number(draft.stats?.baseShares || 0);
        const stats = {
            baseLikes: Number.isFinite(baseLikes) ? Math.max(0, Math.floor(baseLikes)) : 0,
            baseShares: Number.isFinite(baseShares) ? Math.max(0, Math.floor(baseShares)) : 0
        };

        const seoKeywords = Array.isArray(draft.seo?.keywords)
            ? draft.seo.keywords.map(k => String(k).trim()).filter(Boolean)
            : undefined;

        return {
            id,
            slug,
            title,
            cover,
            category: { id: categoryId, name: categoryName },
            tags,
            author: { name: authorName, title: authorTitle || undefined },
            publishedAt,
            updatedAt: String(draft.updatedAt || publishedAt),
            seo: { description: seoDescription, keywords: seoKeywords },
            hero,
            stats,
            content: blocks
        };
    }

    function replaceCustomPostBySlug(slug, nextPost) {
        const current = loadCustomPosts();
        const idx = current.findIndex(p => String(p?.slug || "").trim() === slug);
        if (idx < 0) throw new Error("This post is not a created (custom) post in this browser.");
        current[idx] = { ...nextPost, __custom: true };
        saveCustomPosts(current);
    }

    function replaceRuntimePostBySlug(slug, nextPost) {
        const runtime = window.BLOG_POSTS;
        if (!Array.isArray(runtime)) return;
        const idx = runtime.findIndex(p => p?.slug === slug);
        if (idx < 0) return;
        runtime[idx] = { ...nextPost, __custom: true };
    }

    function renderDraftPreview(post) {
        const preview = $("postDraftPreview");
        if (!preview) return;

        const utils = window.BLOG_UTILS;
        const renderBlocks = typeof utils?.renderBlocks === "function" ? utils.renderBlocks : null;
        const estimateReadingMinutes = typeof utils?.estimateReadingMinutes === "function" ? utils.estimateReadingMinutes : null;

        const minutes = estimateReadingMinutes ? estimateReadingMinutes(post.content) : null;

        preview.innerHTML = `
            <header class="blog-post-header">
                <div class="blog-post-meta">
                    <span class="blog-badge">🏷️ ${escapeHtml(post.category?.name || "")}</span>
                    <span class="blog-badge">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>
                    ${minutes != null ? `<span class="blog-badge">⏱️ ${minutes} min read</span>` : ""}
                    <span class="blog-badge">✍️ ${escapeHtml(post.author?.name || "")}</span>
                </div>
                <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
                <p class="blog-post-summary">${escapeHtml(post.hero?.summary || post.seo?.description || "")}</p>
            </header>
            <section class="blog-post-body" id="draftPreviewBody"></section>
        `;

        const body = preview.querySelector("#draftPreviewBody");
        if (!body) return;

        if (renderBlocks) {
            renderBlocks(body, post.content);
        } else {
            // Fallback: simple rendering (shouldn't happen unless blog.js fails to load).
            body.textContent = "Preview renderer not available.";
        }

        const header = preview.querySelector(".blog-post-header");
        if (header) {
            if (post.cover?.src) {
                const img = document.createElement("img");
                img.className = "blog-cover";
                img.src = post.cover.src;
                img.alt = post.cover.alt || "";
                img.loading = "eager";
                img.decoding = "async";
                header.insertBefore(img, header.firstChild);
            }
        }
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

    function buildExportPayload(posts) {
        const bySlug = {};

        for (const post of posts) {
            const slug = post.slug;
            bySlug[slug] = {
                liked: getBool("liked", slug),
                bookmarked: getBool("bookmarked", slug),
                shares: getNumber("shared", slug),
                comments: getComments(slug)
            };
        }

        return {
            version: 1,
            createdAt: new Date().toISOString(),
            prefix: STORAGE_PREFIX,
            bySlug
        };
    }

    function applyImportPayload(posts, payload, mode) {
        if (!payload || typeof payload !== "object") throw new Error("Invalid JSON payload.");
        if (!payload.bySlug || typeof payload.bySlug !== "object") throw new Error("JSON payload missing bySlug.");

        const knownSlugs = new Set(posts.map(p => p.slug));

        if (mode === "replace") {
            // Clear existing interaction keys
            for (const key of listInteractionKeys()) {
                localStorage.removeItem(key);
            }
        }

        for (const [slug, data] of Object.entries(payload.bySlug)) {
            if (!knownSlugs.has(slug)) continue;
            if (!data || typeof data !== "object") continue;

            if (typeof data.liked === "boolean") setBool("liked", slug, data.liked);
            if (typeof data.bookmarked === "boolean") setBool("bookmarked", slug, data.bookmarked);
            if (typeof data.shares === "number") setNumber("shared", slug, data.shares);
            if (Array.isArray(data.comments)) setComments(slug, data.comments);
        }
    }

    function resetPost(slug) {
        localStorage.removeItem(getKey("liked", slug));
        localStorage.removeItem(getKey("bookmarked", slug));
        localStorage.removeItem(getKey("shared", slug));
        localStorage.removeItem(getKey("comments", slug));
    }

    function getPostStats(post) {
        const slug = post.slug;
        const liked = getBool("liked", slug);
        const bookmarked = getBool("bookmarked", slug);
        const shares = getNumber("shared", slug);
        const comments = getComments(slug);

        return { liked, bookmarked, shares, commentsCount: comments.length };
    }

    function renderSummary(posts) {
        const node = $("adminSummary");
        if (!node) return;

        let likedCount = 0;
        let bookmarkedCount = 0;
        let commentCount = 0;
        let shareCount = 0;

        for (const post of posts) {
            const stats = getPostStats(post);
            if (stats.liked) likedCount += 1;
            if (stats.bookmarked) bookmarkedCount += 1;
            commentCount += stats.commentsCount;
            shareCount += stats.shares;
        }

        node.innerHTML = [
            `<span class="blog-count-pill">❤️ Liked: ${likedCount}</span>`,
            `<span class="blog-count-pill">🔖 Bookmarked: ${bookmarkedCount}</span>`,
            `<span class="blog-count-pill">💬 Comments: ${commentCount}</span>`,
            `<span class="blog-count-pill">🔁 Shares: ${shareCount}</span>`
        ].join(" ");
    }

    function renderPostList(posts, activeSlug, onSelect, customSlugs) {
        const list = $("adminPostList");
        if (!list) return;

        list.innerHTML = "";

        for (const post of posts) {
            const stats = getPostStats(post);
            const isCustom = customSlugs?.has(post.slug);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "blog-admin-post";
            btn.setAttribute("aria-pressed", post.slug === activeSlug ? "true" : "false");

            btn.innerHTML = `
                <div class="blog-admin-post-title">${escapeHtml(post.title)}</div>
                <div class="blog-admin-post-meta">
                    <span class="blog-badge">🏷️ ${escapeHtml(post.category?.name || "")}</span>
                    <span class="blog-badge">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>
                    ${isCustom ? `<span class="blog-badge">🧩 Custom</span>` : ""}
                    <span class="blog-badge">❤️ ${stats.liked ? "Yes" : "No"}</span>
                    <span class="blog-badge">🔖 ${stats.bookmarked ? "Yes" : "No"}</span>
                    <span class="blog-badge">💬 ${stats.commentsCount}</span>
                    <span class="blog-badge">🔁 ${stats.shares}</span>
                </div>
            `;

            btn.addEventListener("click", () => onSelect(post.slug));
            list.appendChild(btn);
        }
    }

    function renderDetails(posts, slug, onChanged, customSlugs) {
        const details = $("adminDetails");
        if (!details) return;

        const post = posts.find(p => p.slug === slug);
        if (!post) {
            details.innerHTML = `<p class="blog-muted">Select a post to view details.</p>`;
            return;
        }

        const liked = getBool("liked", slug);
        const bookmarked = getBool("bookmarked", slug);
        const shares = getNumber("shared", slug);
        const comments = getComments(slug);
        const isCustom = customSlugs?.has(slug);

        details.innerHTML = `
            <div class="blog-admin-details-top">
                <div>
                    <div class="blog-admin-details-title">${escapeHtml(post.title)}</div>
                    <div class="blog-muted">${escapeHtml(post.category?.name || "")} • ${escapeHtml(formatDate(post.publishedAt))}</div>
                </div>
                <a class="blog-btn blog-admin-open" href="./post.html?slug=${encodeURIComponent(slug)}">Open post</a>
            </div>

            <div class="blog-admin-kpis" aria-label="Post KPIs">
                <span class="blog-count-pill">❤️ ${post.stats?.baseLikes || 0} + ${liked ? 1 : 0}</span>
                <span class="blog-count-pill">💬 ${comments.length}</span>
                <span class="blog-count-pill">🔁 ${(post.stats?.baseShares || 0) + shares}</span>
            </div>

            <div class="blog-admin-controls" aria-label="Post controls">
                <button id="toggleLike" class="blog-btn" type="button">${liked ? "Unlike" : "Like"}</button>
                <button id="toggleBookmark" class="blog-btn" type="button">${bookmarked ? "Unbookmark" : "Bookmark"}</button>
                <button id="incShare" class="blog-btn" type="button">+1 Share</button>
                <button id="resetPost" class="blog-btn blog-btn-danger" type="button">Reset post</button>
                ${isCustom ? `<button id="editCustomPost" class="blog-btn" type="button">Edit created post</button>` : ""}
                ${isCustom ? `<button id="deleteCustomPost" class="blog-btn blog-btn-danger" type="button">Delete created post</button>` : ""}
            </div>

            <hr class="blog-hr" />

            <div class="blog-admin-section-head">
                <h2 class="blog-h2">Comments</h2>
                <div class="blog-muted">Edit/delete comments stored in this browser.</div>
            </div>

            <div id="adminCommentList" class="blog-comment-list" aria-label="Comments"></div>
        `;

        const toggleLike = $("toggleLike");
        const toggleBookmark = $("toggleBookmark");
        const incShare = $("incShare");
        const resetBtn = $("resetPost");
        const editCustomPostBtn = $("editCustomPost");
        const deleteCustomPostBtn = $("deleteCustomPost");

        if (toggleLike) {
            toggleLike.addEventListener("click", () => {
                setBool("liked", slug, !getBool("liked", slug));
                onChanged();
            });
        }

        if (toggleBookmark) {
            toggleBookmark.addEventListener("click", () => {
                setBool("bookmarked", slug, !getBool("bookmarked", slug));
                onChanged();
            });
        }

        if (incShare) {
            incShare.addEventListener("click", () => {
                setNumber("shared", slug, getNumber("shared", slug) + 1);
                onChanged();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (!confirm("Reset all interactions for this post in this browser?")) return;
                resetPost(slug);
                onChanged();
            });
        }

        if (editCustomPostBtn) {
            editCustomPostBtn.addEventListener("click", () => {
                const area = $("postDraftArea");
                if (!area) return;
                try {
                    // Load current runtime post into the editor, enable update mode.
                    area.value = JSON.stringify((post && typeof post === "object") ? ((() => {
                        const { __custom, ...rest } = post;
                        return rest;
                    })()) : post, null, 2);

                    // Set edit mode via shared state.
                    // (renderPage's setEditMode lives in the same module scope.)
                    editingSlug = slug;

                    const updateBtn = $("updatePostBtn");
                    const cancelBtn = $("cancelEditBtn");
                    const modeNode = $("draftMode");

                    if (updateBtn) updateBtn.disabled = false;
                    if (cancelBtn) cancelBtn.hidden = false;
                    if (modeNode) {
                        modeNode.hidden = false;
                        modeNode.innerHTML = `<span class="blog-count-pill">✏️ Editing: ${escapeHtml(slug)}</span>`;
                    }

                    // Scroll editor into view for convenience.
                    area.scrollIntoView({ behavior: "smooth", block: "start" });
                } catch {
                    // ignore
                }
            });
        }

        if (deleteCustomPostBtn) {
            deleteCustomPostBtn.addEventListener("click", () => {
                if (!confirm("Delete this created post from this browser? This cannot be undone.")) return;

                // Remove from custom storage
                const current = loadCustomPosts();
                const next = current.filter(p => String(p?.slug || "").trim() !== slug);
                saveCustomPosts(next);

                // Remove from runtime post list
                const runtime = window.BLOG_POSTS;
                if (Array.isArray(runtime)) {
                    const idx = runtime.findIndex(p => p?.slug === slug);
                    if (idx >= 0) runtime.splice(idx, 1);
                }

                // Clean up interactions for the deleted post so it doesn't linger.
                resetPost(slug);

                onChanged();
            });
        }

        const commentList = $("adminCommentList");
        if (commentList) {
            commentList.innerHTML = "";

            if (!comments.length) {
                const empty = document.createElement("p");
                empty.className = "blog-muted";
                empty.textContent = "No comments for this post in this browser.";
                commentList.appendChild(empty);
            } else {
                comments.forEach((c, idx) => {
                    const wrap = document.createElement("div");
                    wrap.className = "blog-admin-comment";

                    wrap.innerHTML = `
                        <div class="blog-comment-head">
                            <div class="blog-comment-name">${escapeHtml(c.name || "Anonymous")}</div>
                            <div class="blog-comment-date">${escapeHtml(formatDate(c.createdAt))}</div>
                        </div>
                        <div class="blog-comment-text" data-role="text">${escapeHtml(c.text || "")}</div>
                        <div class="blog-admin-comment-actions">
                            <button class="blog-btn" type="button" data-action="edit">Edit</button>
                            <button class="blog-btn blog-btn-danger" type="button" data-action="delete">Delete</button>
                        </div>
                    `;

                    wrap.querySelector('[data-action="delete"]').addEventListener("click", () => {
                        if (!confirm("Delete this comment?")) return;
                        const next = getComments(slug);
                        next.splice(idx, 1);
                        setComments(slug, next);
                        onChanged();
                    });

                    wrap.querySelector('[data-action="edit"]').addEventListener("click", () => {
                        const currentText = c.text || "";
                        wrap.innerHTML = `
                            <div class="blog-comment-head">
                                <div class="blog-comment-name">${escapeHtml(c.name || "Anonymous")}</div>
                                <div class="blog-comment-date">${escapeHtml(formatDate(c.createdAt))}</div>
                            </div>
                            <textarea class="blog-textarea" data-role="editArea">${escapeHtml(currentText)}</textarea>
                            <div class="blog-admin-comment-actions">
                                <button class="blog-btn" type="button" data-action="save">Save</button>
                                <button class="blog-btn" type="button" data-action="cancel">Cancel</button>
                            </div>
                        `;

                        wrap.querySelector('[data-action="cancel"]').addEventListener("click", () => onChanged());
                        wrap.querySelector('[data-action="save"]').addEventListener("click", () => {
                            const area = wrap.querySelector('[data-role="editArea"]');
                            const nextText = String(area?.value || "").trim();
                            if (nextText.length < 12) {
                                alert("Comment is too short (min 12 characters).");
                                return;
                            }
                            if (nextText.length > 1200) {
                                alert("Comment is too long (max 1200 characters).");
                                return;
                            }
                            const next = getComments(slug);
                            if (!next[idx]) return;
                            next[idx] = { ...next[idx], text: nextText };
                            setComments(slug, next);
                            onChanged();
                        });
                    });

                    commentList.appendChild(wrap);
                });
            }
        }
    }

    function renderPage() {
        const posts = window.BLOG_POSTS || [];
        const errorNode = $("adminError");
        const importPanel = $("importPanel");

        function getCustomSlugs() {
            return new Set(loadCustomPosts().map(p => String(p?.slug || "").trim()).filter(Boolean));
        }

        const exportBtn = $("exportBtn");
        const importToggleBtn = $("importToggleBtn");
        const clearAllBtn = $("clearAllBtn");

        const importArea = $("importArea");
        const importMergeBtn = $("importMergeBtn");
        const importReplaceBtn = $("importReplaceBtn");
        const importCancelBtn = $("importCancelBtn");

        if (!posts.length) {
            if (errorNode) errorNode.textContent = "No posts found.";
            return;
        }

        let activeSlug = posts[0].slug;

        function setError(msg) {
            if (!errorNode) return;
            errorNode.textContent = msg || "";
        }

        function rerender() {
            setError("");

            // Keep active slug valid (e.g., after deleting a created post)
            if (!posts.find(p => p.slug === activeSlug)) {
                activeSlug = posts[0]?.slug || "";
            }

            const customSlugs = getCustomSlugs();
            renderSummary(posts);
            renderPostList(posts, activeSlug, (slug) => {
                activeSlug = slug;
                rerender();
            }, customSlugs);
            renderDetails(posts, activeSlug, rerender, customSlugs);
        }

        // Create + preview
        const postDraftArea = $("postDraftArea");
        const previewDraftBtn = $("previewDraftBtn");
        const createPostBtn = $("createPostBtn");
        const updatePostBtn = $("updatePostBtn");
        const cancelEditBtn = $("cancelEditBtn");
        const clearDraftBtn = $("clearDraftBtn");
        const postDraftError = $("postDraftError");
        const draftMode = $("draftMode");

        function setDraftError(msg) {
            if (!postDraftError) return;
            postDraftError.textContent = msg || "";
        }

        function getAllSlugs() {
            return new Set((window.BLOG_POSTS || []).map(p => p.slug));
        }

        function setEditMode(slugOrNull) {
            editingSlug = slugOrNull ? String(slugOrNull) : null;
            const isEditing = Boolean(editingSlug);

            if (updatePostBtn) updatePostBtn.disabled = !isEditing;
            if (cancelEditBtn) cancelEditBtn.hidden = !isEditing;

            if (draftMode) {
                draftMode.hidden = !isEditing;
                draftMode.innerHTML = isEditing
                    ? `<span class="blog-count-pill">✏️ Editing: ${escapeHtml(editingSlug)}</span>`
                    : "";
            }
        }

        function loadPostIntoEditor(post) {
            if (!postDraftArea) return;
            postDraftArea.value = prettyJson(stripRuntimeFields(post));
        }

        function readDraftJson() {
            const raw = String(postDraftArea?.value || "").trim();
            if (!raw) throw new Error("Paste post JSON first.");
            return JSON.parse(raw);
        }

        if (previewDraftBtn) {
            previewDraftBtn.addEventListener("click", () => {
                try {
                    setDraftError("");
                    const draft = readDraftJson();

                    // Preview should allow reusing a slug that exists only when you haven't created yet.
                    // We'll preview against current slugs but allow same slug if it refers to the same draft id.
                    const existingSlugs = getAllSlugs();
                    const tmpSlugs = new Set(existingSlugs);
                    // For preview we don't require uniqueness; normalizeDraftToPost enforces it.
                    // So normalize loosely here.
                    const slug = toSlug(draft.slug);
                    if (!slug) throw new Error("Missing or invalid 'slug'.");

                    const previewPost = {
                        ...draft,
                        slug,
                        title: String(draft.title || "").trim(),
                        category: {
                            id: String(draft.category?.id || "").trim(),
                            name: String(draft.category?.name || titleCaseFromId(draft.category?.id || "")).trim()
                        },
                        author: {
                            name: String(draft.author?.name || "").trim(),
                            title: String(draft.author?.title || "").trim() || undefined
                        },
                        publishedAt: String(draft.publishedAt || new Date().toISOString()).trim(),
                        seo: {
                            description: String(draft.seo?.description || "").trim(),
                            keywords: Array.isArray(draft.seo?.keywords) ? draft.seo.keywords : undefined
                        },
                        hero: draft.hero,
                        stats: draft.stats,
                        content: draft.content
                    };

                    if (!previewPost.title) throw new Error("Missing 'title'.");
                    if (!previewPost.category?.id) throw new Error("Missing 'category.id'.");
                    if (!previewPost.author?.name) throw new Error("Missing 'author.name'.");
                    if (!previewPost.seo?.description) throw new Error("Missing 'seo.description'.");
                    if (!Array.isArray(previewPost.content) || !previewPost.content.length) throw new Error("Missing 'content' blocks.");

                    renderDraftPreview(previewPost);
                } catch (e) {
                    setDraftError(e?.message || "Preview failed.");
                }
            });
        }

        if (createPostBtn) {
            createPostBtn.addEventListener("click", () => {
                try {
                    setDraftError("");
                    const draft = readDraftJson();

                    const existingSlugs = getAllSlugs();
                    const post = normalizeDraftToPost(draft, existingSlugs);

                    // Save locally
                    const current = loadCustomPosts();
                    current.unshift({ ...post, __custom: true });
                    // Ensure slug uniqueness inside storage too
                    const seen = new Set();
                    const deduped = [];
                    for (const p of current) {
                        const s = String(p?.slug || "").trim();
                        if (!s || seen.has(s)) continue;
                        seen.add(s);
                        deduped.push(p);
                    }
                    saveCustomPosts(deduped);

                    // Make it available immediately without reload.
                    if (Array.isArray(window.BLOG_POSTS)) {
                        window.BLOG_POSTS.push({ ...post, __custom: true });
                    }

                    // Select new post in the interaction manager and rerender.
                    activeSlug = post.slug;
                    rerender();

                    renderDraftPreview(post);
                    setDraftError(`Created locally: ${post.slug}`);

                    // If user was editing, exit edit mode after create.
                    setEditMode(null);
                } catch (e) {
                    setDraftError(e?.message || "Create failed.");
                }
            });
        }

        if (updatePostBtn) {
            updatePostBtn.addEventListener("click", () => {
                try {
                    setDraftError("");
                    if (!editingSlug) throw new Error("Not currently editing a created post.");

                    const draft = readDraftJson();

                    // Ensure slug stays the same while editing.
                    const allSlugs = getAllSlugs();
                    // Remove the currently edited slug from the uniqueness set.
                    allSlugs.delete(editingSlug);

                    const post = normalizeDraftToPost(draft, allSlugs, { mustKeepSlug: editingSlug });

                    replaceCustomPostBySlug(editingSlug, post);
                    replaceRuntimePostBySlug(editingSlug, post);

                    activeSlug = editingSlug;
                    rerender();
                    renderDraftPreview(post);
                    setDraftError(`Updated locally: ${post.slug}`);

                    // Keep edit mode on the same slug (explicit cancel to exit).
                    setEditMode(editingSlug);
                } catch (e) {
                    setDraftError(e?.message || "Update failed.");
                }
            });
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener("click", () => {
                setEditMode(null);
                setDraftError("");
            });
        }

        if (clearDraftBtn && postDraftArea) {
            clearDraftBtn.addEventListener("click", () => {
                if (!confirm("Clear the draft editor?")) return;
                postDraftArea.value = "";
                setDraftError("");
                setEditMode(null);
                const preview = $("postDraftPreview");
                if (preview) preview.innerHTML = '<p class="blog-muted">Click “Preview” to render your draft here.</p>';
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener("click", async () => {
                try {
                    const payload = buildExportPayload(posts);
                    const json = JSON.stringify(payload, null, 2);
                    const ok = await copyToClipboard(json);
                    setError(ok ? "Export copied to clipboard." : "Export ready (copy manually from the console)." );
                    if (!ok) console.log(payload);
                } catch {
                    setError("Export failed.");
                }
            });
        }

        if (importToggleBtn && importPanel) {
            importToggleBtn.addEventListener("click", () => {
                importPanel.hidden = !importPanel.hidden;
                setError("");
            });
        }

        if (importCancelBtn && importPanel && importArea) {
            importCancelBtn.addEventListener("click", () => {
                importArea.value = "";
                importPanel.hidden = true;
                setError("");
            });
        }

        function doImport(mode) {
            try {
                const text = String(importArea?.value || "").trim();
                if (!text) {
                    setError("Paste JSON first.");
                    return;
                }
                const payload = JSON.parse(text);
                applyImportPayload(posts, payload, mode);
                if (importArea) importArea.value = "";
                if (importPanel) importPanel.hidden = true;
                setError(mode === "replace" ? "Imported (replaced existing data)." : "Imported (merged)." );
                rerender();
            } catch (e) {
                setError(e?.message || "Import failed.");
            }
        }

        if (importMergeBtn) {
            importMergeBtn.addEventListener("click", () => doImport("merge"));
        }

        if (importReplaceBtn) {
            importReplaceBtn.addEventListener("click", () => doImport("replace"));
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener("click", () => {
                if (!confirm("Reset ALL blog interactions in this browser?")) return;
                for (const key of listInteractionKeys()) {
                    localStorage.removeItem(key);
                }
                rerender();
                setError("All interactions reset.");
            });
        }

        rerender();

        // Initialize editor mode UI.
        setEditMode(null);
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderPage();
    });
})();
