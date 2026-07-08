import { browser } from "$app/environment";

export async function registerServiceWorker() {
    if (!browser) return;

    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
        );
    }
}