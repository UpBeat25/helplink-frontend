<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from "mode-watcher";
	let { children } = $props();
	import SunIcon from "@lucide/svelte/icons/sun";
  	import MoonIcon from "@lucide/svelte/icons/moon";
	import { Button } from "$lib/components/ui/button/index.js";
  	import { toggleMode } from "mode-watcher";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { onMount } from "svelte";

</script>
<Toaster />
<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
{@render children?.()}
<Button onclick={toggleMode} variant="outline" size="icon" class="fixed bottom-7 right-4">
  <SunIcon
    class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
  />
  <MoonIcon
    class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
  />
  <span class="sr-only">Toggle theme</span>
</Button>
