// check if spf is defined, if it is, then that means we do have it.
let is_spf = false;
if (typeof spf !== "undefined") {
    console.debug("SPF appears to have initialized.");
    is_spf = true;
} else {
    console.debug("SPF is not available.")
}

function triggerReady() {
    console.debug("triggerReady()");
    document.dispatchEvent(new Event('pageReady'));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerReady, { once: true });
} else {
    triggerReady();
}

if (is_spf) {
    const bar = document.getElementById("progress");

    window.addEventListener("spfrequest", function () {
        console.debug("spfrequest");
        // if it still exists, delete it so the bar doesn't go 
        // right-to-left in a jarring way.
        if (bar) {
            bar.remove();
        }
        setSpfProgressBar([900, 60, "waiting"]);
    });

    window.addEventListener("spfprocess", function () {
        setSpfProgressBar([500, 99, "waiting"]);
    });

    window.addEventListener("spfdone", function () {
        triggerReady();
        setSpfProgressBar([300, 101, "done"]);

        clearTimeout(spfProgressRemovalTimer);

        spfProgressRemovalTimer = setTimeout(() => {
            const bar = document.getElementById("progress");
            if (bar) {
                bar.remove();
            }
        }, 350);
    });
}

let guidePinned = false;
if (document.documentElement.classList.contains("guide-pinned")) {
    guidePinned = true;
}

function error(error) {
    console.error("OpenSB Finalium Skin Error: " + error);
}

function handleCommentEvents() {
    commentContents = document.getElementById('commentContents');
    postButton = document.getElementById('post');

    // the post button
    if (postButton) {
        postButton.addEventListener('click', function () {
            const commentText = commentContents ? commentContents.value.trim() : '';
            if (!commentText) {
                return alert('You must enter a comment before posting.');
            }
            submitComment(comment_location_type, comment_location_id, commentContents);
        });
    }

    // start a new reply button
    document.addEventListener('click', function (e) {
        const replyButton = e.target.closest('.reply-button');
        if (replyButton) {
            const commentId = replyButton.dataset.commentId;
            const replyForm = document.getElementById(`reply-form-${commentId}`);

            // close the other reply form
            document.querySelectorAll('[id^="reply-form-"]').forEach(function (form) {
                if (form !== replyForm) {
                    form.style.display = 'none';
                }
            });

            if (replyForm) {
                replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    // send reply button
    document.addEventListener('click', function (e) {
        const submitReplyButton = e.target.closest('.submit-reply-button');
        if (submitReplyButton) {
            const commentId = submitReplyButton.dataset.commentId;
            const replyContents = document.getElementById(`reply_contents_${commentId}`);
            if (!replyContents || !replyContents.value.trim()) {
                return alert('You must enter a reply before posting.');
            }
            submitComment(comment_location_type, comment_location_id, replyContents, commentId);
        }
    });

    // cancel button (hardcoded to replies, whatever)
    document.addEventListener('click', function (e) {
        const cancelButton = e.target.closest('.submit-cancel-button');
        if (cancelButton) {
            const replyForm = cancelButton.closest('[id^="reply-form-"]');
            if (replyForm) {
                replyForm.style.display = 'none';
            }
        }
    });
}

function submitComment(type, id, content, replyTo = 0) {
    fetchWithRetry("/api/skin/comment_send", {
        method: "POST",
        body: JSON.stringify({
            type: type,
            id: id,
            comment: content.value,
            reply_to: replyTo
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(json => {
            if (json.error) {
                error("Failed to comment:", json.error);
            } else {
                if (replyTo !== 0) {
                    let repliesContainer = document.getElementById(`replies-${replyTo}`);
                    if (repliesContainer) {
                        repliesContainer.insertAdjacentHTML("beforeend", json.html);
                        let replyForm = document.getElementById(`reply-form-${replyTo}`);
                        if (replyForm) replyForm.style.display = "none";
                    } else {
                        error(`replies-${replyTo} doesn't exist.`);
                    }
                } else {
                    let new_comment = document.getElementById('new-comment');
                    if (new_comment) {
                        new_comment.insertAdjacentHTML('afterend', json.html);
                    } else {
                        error(`The comment form does not appear to exist.`);
                    }
                }
                content.value = '';
            }
        });
}

function toggleNotAvailable() {
    const watch_not_available = document.getElementById('watch-not-available');

    if (watch_not_available) {
        toggleElementDisplay(watch_not_available);
    }
}

// content snap width
var SNAP_CLASSES = [
    "content-snap-width-1",
    "content-snap-width-2",
    "content-snap-width-3"
];

function getViewportWidth() {
    return document.documentElement.clientWidth || window.innerWidth;
}

function calculateContentSnapWidth(guidePinned) {
    var width = getViewportWidth() - 21 - 50;

    // the guide hides at 1250px, but we need to account for the guide at 1251px and above.
    if (getViewportWidth() >= 1251 && guidePinned) {
        width -= 230; // 230px is the length of the guide
    }

    return width;
}

function handlePinnedGuide() {
    if (guidePinned) {
        if (getViewportWidth() >= 1251) {
            document.documentElement.classList.add("guide-pinned");
        } else {
            document.documentElement.classList.remove("guide-pinned");
            if (document.documentElement.classList.contains("show-guide")) {
                document.documentElement.classList.remove("show-guide");
            }
        }
    }
}

function pickContentSnapClass(width) {
    if (width >= 1262) return "content-snap-width-3";
    if (width >= 1056) return "content-snap-width-2";
    return "content-snap-width-1";
}

function updateContentSnap() {
    var body = document.body;

    var guidePinnedAndShown = document.documentElement.classList.contains("show-guide") && document.documentElement.classList.contains("guide-pinned");

    var width = calculateContentSnapWidth(guidePinnedAndShown);
    var snap = pickContentSnapClass(width);

    for (var i = 0; i < SNAP_CLASSES.length; i++) {
            var cls = SNAP_CLASSES[i];
            var shouldHave = (cls === snap);
            var has = body.classList.contains(cls);

            if (has !== shouldHave) {
            body.classList.toggle(cls, shouldHave);
        }
    }
}

let spfProgressUpdateTimer = null;
let spfProgressClassTimer = null;
let spfProgressRemovalTimer = null;

function setSpfProgressBar([duration, percent, className]) {
    if (!is_spf) return;

    let bar = document.getElementById("progress");

    if (!bar) {
        bar = document.createElement("div");
        bar.id = "progress";
        bar.append(
            document.createElement("dt"),
            document.createElement("dd")
        );
        document.body.appendChild(bar);
    }

    clearTimeout(spfProgressUpdateTimer);
    clearTimeout(spfProgressClassTimer);

    spfProgressUpdateTimer = setTimeout(() => {
        bar.className = "";

        bar.style.transition = `width ${duration}ms ease`;
        bar.style.width = `${percent}%`;

        spfProgressClassTimer = setTimeout(() => {
            bar.className = className;
        }, duration);
    }, 0);
}

document.addEventListener("pageReady", () => {
    document.querySelectorAll(".expander").forEach(expander => {
        expander.addEventListener("click", (e) => {
            const button = e.target.closest(".button-expander");
            if (!button || !expander.contains(button)) return;

            expander.classList.toggle("expander-collapsed");
        });
    });
});

function handleScaleChanges() {
    handlePinnedGuide();
    if (document.body.classList.contains("flex-width-enabled")) {
        updateContentSnap();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    handleScaleChanges();
    window.addEventListener("resize", function () {
        handleScaleChanges();
    });

    // ported from trinium
    // Get all menu buttons
    const menuButtons = document.querySelectorAll('.menu-button');

    // Add event listeners for each menu button
    menuButtons.forEach(button => {
        const menuId = button.getAttribute('data-menu-id');
        const menu = document.getElementById(menuId);

        // check if this menu button is the one in the header.
        const isThisTheHeaderUserMenu = button.classList.contains("user-menu-button");

        // get the caret if that exists. this is primarily for the one in the header.
        const menuCaret = button.getElementsByClassName("menu-caret");

        // TODO: make this use bootstrap icons or some shit i dont know
        let menuCaretOff = "icon caret-closed menu-caret";
        let menuCaretOn = "icon caret-open menu-caret";

        let actualCaret;
        if (menuCaret.length === 1) {
            actualCaret = menuCaret.item(0);
        } else if (menuCaret.length > 1) {
            // this shouldn't happen. if it does then i fucked this up. -chaziz 6/28/2024
            console.warn("There's a menu that has more than one caret? Huh?")
            actualCaret = menuCaret.item(0);
        }

        // initialize all menus with "none"
        menu.style.display = 'none';

        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();

            if (menu.style.display === 'none') {
                if (actualCaret) {
                    actualCaret.className = menuCaretOn;
                }
                if (isThisTheHeaderUserMenu) {
                    button.classList.add("selected");
                }
                menu.style.display = 'block';
            } else {
                closeMenu();
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!menu.contains(e.target) && !button.contains(e.target)) {
                closeMenu();
            }
        });

        document.querySelectorAll('[onclick]').forEach(element => {
            element.addEventListener('click', () => {
                closeMenu();
            });
        });

        function closeMenu() {
            if (actualCaret) {
                actualCaret.className = menuCaretOff;
            }
            if (isThisTheHeaderUserMenu) {
                button.classList.remove("selected");
            }
            menu.style.display = 'none';
        }

        /*
        document.querySelectorAll('.menu-item-button').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMenu();
                
                const action = item.dataset.action;
                if (action && menuActions[action]) {
                    menuActions[action]();
                }
            });
        });
        */
    });

    // Get all tab groups
    const tabGroups = document.querySelectorAll(".tab-group");
    tabGroups.forEach(tabGroup => {
        // Get all tab links in the tab group
        const tabLinks = tabGroup.querySelectorAll(".tablink")

        // open the first tab automatically
        if (tabLinks.length > 0) {
            const firstTab = tabLinks.item(0);

            if (firstTab) {
                const tabId = firstTab.getAttribute("data-tab");
                if (tabId) {
                    const firstTabId = document.getElementById(tabId);
                    if (firstTabId) {
                        firstTabId.style.display = "block";
                        firstTab.classList.add("active");
                    } else {
                        error(`Tab ${tabId} is missing contents.`)
                    }
                }
            } else {
                error("THIS SHOULD NOT HAPPEN.");
            }
        }

        tabLinks.forEach(tabLink => {
            // check if this tab has "data-tab". if it doesn't then don't bother.
            const tabId = tabLink.getAttribute("data-tab");

            if (tabId) {
                tabLink.addEventListener("click", function () {
                    // Hide all tab content
                    const tabContents = tabGroup.querySelectorAll(".tabcontent");
                    tabContents.forEach(tabContent => {
                        tabContent.style.display = "none";
                    });

                    // Remove 'active' class from all tab links
                    tabLinks.forEach(link => {
                        link.classList.remove("active");
                    });

                    // Show the selected tab content and mark the button as active
                    const selectedTabId = document.getElementById(tabId);

                    if (selectedTabId) {
                        selectedTabId.style.display = "block";
                        this.classList.add("active");
                    } else {
                        error(`Tab ${tabId} is missing contents.`)
                    }
                });
            }
        });
    });

    // tooltip start
    // tooltip states
    var tooltipEl = null;
    var showTimer = null;

    // tooltip helper
    function createTooltip(text) {
        var el = document.createElement("div");
        el.className = "tooltip";
        el.appendChild(document.createTextNode(text));
        document.body.appendChild(el);

        // force reflow for transition
        el.offsetHeight;
        el.style.opacity = "1";

        return el;
    }

    function destroyTooltip() {
        if (!tooltipEl) return;
        tooltipEl.parentNode.removeChild(tooltipEl);
        tooltipEl = null;
    }

    function positionTooltip(target) {
        if (!tooltipEl) return;

        var rect = target.getBoundingClientRect();
        var tipRect = tooltipEl.getBoundingClientRect();

        var top = rect.top - tipRect.height - 8;
        var left = rect.left + (rect.width / 2) - (tipRect.width / 2);

        // flip if needed
        if (top < 8) top = rect.bottom + 8;
        if (left < 8) left = 8;

        tooltipEl.style.top = top + "px";
        tooltipEl.style.left = left + "px";
    }

    function findTooltipTarget(node) {
        while (node && node !== document) {
            if (
                node.nodeType === 1 &&
                node.classList &&
                node.classList.contains("uix-tooltip")
            ) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    // tooltip events
    document.addEventListener("mouseover", function (e) {
        var el = findTooltipTarget(e.target);
        if (!el || tooltipEl) return;

        // ignore moves inside the same tooltip target
        if (el.contains(e.relatedTarget)) return;

        var title = el.getAttribute("title");
        if (!title) return;

        // suppress native tooltip
        el.setAttribute("data-tooltip-title", title);
        el.removeAttribute("title");

        showTimer = setTimeout(function () {
            tooltipEl = createTooltip(title);
            positionTooltip(el);
        });
    });

    document.addEventListener("mouseout", function (e) {
        var el = findTooltipTarget(e.target);
        if (!el) return;

        // ignore moves inside the same element
        if (el.contains(e.relatedTarget)) return;

        clearTimeout(showTimer);
        destroyTooltip();

        // restore title fallback
        var oldTitle = el.getAttribute("data-tooltip-title");
        if (oldTitle) {
            el.setAttribute("title", oldTitle);
            el.removeAttribute("data-tooltip-title");
        }
    });

    document.addEventListener("scroll", destroyTooltip, true);
    // tooltip end

    // container
    var page = document.getElementById("page");

    // guide button
    var guide_button = document.getElementById("guide-toggle");

    if (guide_button) {
        guide_button.addEventListener("click", function () {
            var guide = document.getElementById("guide");
            if (guide) {
                document.documentElement.classList.toggle("show-guide");

                if (document.documentElement.classList.contains("guide-pinned") && document.body.classList.contains("flex-width-enabled")) {
                    updateContentSnap();
                }
            } else {
                error("where the fuck is the guide???")
            }
        });
    }

    // logged out error?
    const actionUnlogged = document.getElementById('action_unlogged');
    if (actionUnlogged) {
        actionUnlogged.addEventListener('click', function () {
            alert('You cannot proceed with this action.');
        });
    }

    const watch_not_available = document.getElementById('watch-not-available');
    const watch_not_available_close = document.getElementById('watch-not-available-close');

    if (watch_not_available) {
        watch_not_available_close.addEventListener('click', function () {
            toggleElementDisplay(watch_not_available);
        });
    }

    // load comments
    const comments = document.getElementById('comments');
    if (comments) {
        fetchWithRetry(`/api/skin/comment_load?location=${encodeURIComponent(comment_location_type)}&id=${encodeURIComponent(comment_location_id)}`, {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then(response => response.json())
            .then(json => {
                commentContents = document.getElementById('commentContents');
                postButton = document.getElementById('post');
                commentSection = document.getElementById('comment');

                console.log("Loaded comments");
                comments.innerHTML = json.html;

                handleCommentEvents();
            })
    }

    // follow/subscribe buttons
    document.querySelectorAll('.button-follow').forEach(followButton => {
        const userId = followButton.dataset.userId;
        const followCountEl = followButton.closest('.follow-wrapper')?.querySelector('.follow-count')
            ?? document.querySelector('.follow-count');

        followButton.addEventListener('click', function () {
            fetchWithRetry('/api/skin/user_interaction', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'follow',
                    member: userId,
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            })
                .then(response => response.json())
                .then(json => {
                    if (json['error']) {
                        error(json['error']);
                    } else {
                        if (followCountEl) {
                            followCountEl.textContent = json['number'];
                        }
                        followButton.dataset.following = json['followed'] ? '1' : '0';
                        followButton.classList.toggle('following', json['followed']);
                    }
                })
                .catch(err => {
                    error('Failed to follow:', err);
                });
        });
    });

    // like/dislike 
    const likeButton = document.getElementById('like');
    const dislikeButton = document.getElementById('dislike');
    const likeCount = document.getElementById('like-count');
    const dislikeCount = document.getElementById('dislike-count');

    if (likeButton && dislikeButton && likeCount && dislikeCount) {

        const buttons = {
            like: likeButton,
            dislike: dislikeButton,
        };

        const counts = {
            like: likeCount,
            dislike: dislikeCount,
        };

        function getState() {
            if (likeButton.classList.contains('button-toggled')) return 'like';
            if (dislikeButton.classList.contains('button-toggled')) return 'dislike';
            return null;
        }

        function updateCount(el, delta) {
            el.textContent = Math.max(0, (parseInt(el.textContent, 10) || 0) + delta);
        }

        function applyState(prev, next) {
            if (prev) {
                buttons[prev].classList.remove('button-toggled');
                updateCount(counts[prev], -1);
            }

            if (next) {
                buttons[next].classList.add('button-toggled');
                updateCount(counts[next], +1);
            }
        }

        function sendInteraction(action) {
            return fetchWithRetry("/api/skin/upload_interaction", {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=UTF-8" },
                body: JSON.stringify({
                    action,
                    upload: upload_int_id,
                }),
            }).then(res => {
                if (!res.ok) throw new Error("request failed");
                return res.json().catch(() => null);
            });
        }

        function handleClick(type) {
            const prev = getState();
            const next = prev === type ? null : type;
            const action = next ? type : 'unrate';

            sendInteraction(action)
                .then(() => applyState(prev, next))
                .catch(() => {
                    alert('Failed to rate upload. Please try again later.');
                    error('Failed to rate upload.')
                });
        }

        likeButton.addEventListener('click', () => handleClick('like'));
        dislikeButton.addEventListener('click', () => handleClick('dislike'));
    }

    let debug_button = (document.getElementById('debug-button'));
    let debug_dialog = (document.getElementById('debug-dialog'));

    if (debug_button) {
        debug_button.addEventListener("click", () => {
            debug_dialog.showModal();
        });
    }
});