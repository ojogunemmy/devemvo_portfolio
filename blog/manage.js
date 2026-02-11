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

    function renderPostList(posts, activeSlug, onSelect) {
        const list = $("adminPostList");
        if (!list) return;

        list.innerHTML = "";

        for (const post of posts) {
            const stats = getPostStats(post);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "blog-admin-post";
            btn.setAttribute("aria-pressed", post.slug === activeSlug ? "true" : "false");

            btn.innerHTML = `
                <div class="blog-admin-post-title">${escapeHtml(post.title)}</div>
                <div class="blog-admin-post-meta">
                    <span class="blog-badge">🏷️ ${escapeHtml(post.category?.name || "")}</span>
                    <span class="blog-badge">📅 ${escapeHtml(formatDate(post.publishedAt))}</span>
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

    function renderDetails(posts, slug, onChanged) {
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
            renderSummary(posts);
            renderPostList(posts, activeSlug, (slug) => {
                activeSlug = slug;
                rerender();
            });
            renderDetails(posts, activeSlug, rerender);
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
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderPage();
    });
})();
