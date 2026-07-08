<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from "mode-watcher";
	let { children } = $props();
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { onMount } from "svelte";

    onMount(async () => {
        if ("serviceWorker" in navigator) {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("Service Worker Registered");
        }
    });
</script>
<Toaster position="top-center" />
<svelte:head>
	<link rel="icon" href="/HelpLink_fav.png" />
</svelte:head>

<ModeWatcher defaultMode="light" />
{@render children?.()}
