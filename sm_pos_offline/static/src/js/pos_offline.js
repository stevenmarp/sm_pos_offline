/** @odoo-module **/

// ponytail: plain registration, browser drives the SW lifecycle. Needs HTTPS
// (or localhost); silently skipped elsewhere, POS keeps working online.
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sm_pos_offline/service_worker.js", { scope: "/pos/" })
        .catch((error) =>
            console.warn("[sm_pos_offline] service worker registration failed:", error)
        );
}
