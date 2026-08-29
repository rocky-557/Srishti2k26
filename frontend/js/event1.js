(function () {
    "use strict";

    // Initialize event modal and 3D card flip handlers
    function initEventModals() {
        document.addEventListener("click", function (e) {
            // 1. View More Button Click Handler
            var viewMoreBtn = e.target.closest(".interior .btn, [id^='div-']");
            if (viewMoreBtn) {
                e.preventDefault();
                var idAttr = viewMoreBtn.id; // e.g. "div-1"
                var num = idAttr ? idAttr.replace("div-", "") : null;
                
                if (!num) {
                    var parentRow = viewMoreBtn.closest(".event-row");
                    if (parentRow && parentRow.id) {
                        num = parentRow.id.replace("event-row-", "");
                    }
                }

                if (num) {
                    var modal = document.getElementById("id" + num);
                    var row = document.getElementById("event-row-" + num) || viewMoreBtn.closest(".event-row");

                    if (modal) {
                        modal.style.opacity = "1";
                        modal.style.visibility = "visible";
                        modal.style.pointerEvents = "auto";
                    }
                    if (row) {
                        row.classList.add("flipped");
                    }
                }
                return;
            }

            // 2. Modal Close Button Click Handler
            var closeBtn = e.target.closest(".close-container, .modal-close");
            if (closeBtn) {
                e.preventDefault();
                var modal = closeBtn.closest(".modal-window");
                var row = closeBtn.closest(".event-row");

                if (modal) {
                    modal.style.opacity = "0";
                    modal.style.visibility = "hidden";
                    modal.style.pointerEvents = "none";
                }
                if (row) {
                    row.classList.remove("flipped");
                }
                return;
            }

            // 3. Backdrop Click Handler (close when clicking outside modal box content)
            var activeModal = e.target.closest(".modal-window");
            if (activeModal && e.target === activeModal) {
                activeModal.style.opacity = "0";
                activeModal.style.visibility = "hidden";
                activeModal.style.pointerEvents = "none";
                var parentRow = activeModal.closest(".event-row");
                if (parentRow) {
                    parentRow.classList.remove("flipped");
                }
            }
        });

        // 4. Keyboard Escape key to close any active modal
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" || e.keyCode === 27) {
                var openModals = document.querySelectorAll(".modal-window");
                openModals.forEach(function (m) {
                    m.style.opacity = "0";
                    m.style.visibility = "hidden";
                    m.style.pointerEvents = "none";
                });
                var flippedRows = document.querySelectorAll(".event-row.flipped");
                flippedRows.forEach(function (r) {
                    r.classList.remove("flipped");
                });
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initEventModals);
    } else {
        initEventModals();
    }
})();
