<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from "mode-watcher";
	let { children } = $props();
	import { Toaster } from "$lib/components/ui/sonner/index.js";
</script>
<Toaster />
<svelte:head>
	<link rel="icon" href="/HelpLink_fav.png" />
</svelte:head>

<ModeWatcher />
{@render children?.()}
