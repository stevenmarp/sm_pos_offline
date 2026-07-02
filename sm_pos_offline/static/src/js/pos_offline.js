/** @odoo-module **/

// ponytail: plain registration, browser drives the SW lifecycle. Needs HTTPS
// (or localhost); silently skipped elsewhere, POS keeps working online.
if ("serviceWorker" in navigator) {
    // First load happens BEFORE the SW controls the page, so nothing got
    // cached. When the SW takes control (first install or update), reload
    // once so the page + assets + data RPCs all flow through the SW cache.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!reloaded) {
            reloaded = true;
            window.location.reload();
        }
    });
    navigator.serviceWorker
        .register("/sm_pos_offline/service_worker.js", { scope: "/pos/" })
        .catch((error) =>
            console.warn("[sm_pos_offline] service worker registration failed:", error)
        );
}
