<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Firebase service worker
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/firebase-messaging-sw.js')
				.then(() => console.log('Service Worker Registered'))
				.catch((error) => console.error('Service Worker registration failed', error));
		}

		// Global @username linkifier
		const mentionRegex = /(^|[^\w@])(@[a-zA-Z0-9._]+)/g;

		function processTextNode(node: Text) {
			const text = node.nodeValue;

			if (!text || !mentionRegex.test(text)) {
				mentionRegex.lastIndex = 0;
				return;
			}

			mentionRegex.lastIndex = 0;

			const fragment = document.createDocumentFragment();
			let lastIndex = 0;
			let match: RegExpExecArray | null;

			while ((match = mentionRegex.exec(text)) !== null) {
				const prefix = match[1];
				const mention = match[2];

				const matchStart = match.index;
				const mentionStart = matchStart + prefix.length;

				// Text before the mention
				if (mentionStart > lastIndex) {
					fragment.appendChild(document.createTextNode(text.slice(lastIndex, mentionStart)));
				}

				// Create profile link
				const link = document.createElement('a');

				link.href = `/profile/${encodeURIComponent(mention.slice(1))}`;

				link.textContent = mention;

				link.className = 'font-semibold text-primary hover:underline';

				fragment.appendChild(link);

				lastIndex = mentionStart + mention.length;
			}

			// Remaining text
			if (lastIndex < text.length) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
			}

			node.parentNode?.replaceChild(fragment, node);
		}

		function processElement(element: Element) {
			const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

			const textNodes: Text[] = [];

			let node: Node | null;

			while ((node = walker.nextNode())) {
				const parent = node.parentElement;

				if (
					parent &&
					!['A', 'BUTTON', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)
				) {
					textNodes.push(node as Text);
				}
			}

			for (const textNode of textNodes) {
				processTextNode(textNode);
			}
		}

		// Process everything already on the page
		processElement(document.body);

		// Process content added later
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.nodeType === Node.TEXT_NODE) {
						processTextNode(addedNode as Text);
					} else if (addedNode.nodeType === Node.ELEMENT_NODE) {
						processElement(addedNode as Element);
					}
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		// Cleanup when layout is destroyed
		return () => {
			observer.disconnect();
		};
	});
</script>

<Toaster position="top-center" />

<svelte:head>
	<link rel="icon" href="/HelpLink_fav.png" />
</svelte:head>

<ModeWatcher defaultMode="light" />

{@render children?.()}
