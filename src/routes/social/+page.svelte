<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import SideMenu from '$lib/components/menu.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	const user = pb.authStore.record;

	let records = $state<any[]>([]);
	let displayedRecords = $state<any[]>([]);

	let latitude = $state(0);
	let longitude = $state(0);

	let loading = $state(true);
	let loadingMore = $state(false);

	// Image lightbox
	let selectedImage = $state<string | null>(null);

	// Track which descriptions are expanded
	let expandedDescriptions = $state<Set<string>>(new Set());

	const RADIUS_METERS = 10000;
	const INITIAL_RESULTS = 30;
	const LOAD_MORE_COUNT = 10;

	// Maximum description length before collapsing
	const DESCRIPTION_LIMIT = 300;

	function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371e3;

		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;

		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;

		const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}

	function getLocation(): Promise<{ lat: number; lng: number }> {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject('Geolocation is not supported by your browser.');
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(pos) => {
					latitude = pos.coords.latitude;
					longitude = pos.coords.longitude;

					resolve({
						lat: latitude,
						lng: longitude
					});
				},
				(err) => {
					reject('Unable to retrieve location: ' + err.message);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		});
	}

	async function loadPosts() {
		if (!user) {
			goto('/login');
			return;
		}

		try {
			loading = true;

			const allPosts = await pb.collection('stories').getFullList({
				sort: '-created',
				expand: 'owner',
				fields: `
					id,
					title,
					description,
					image,
					lat,
					lng,
					owner,
					created,
					expand.owner.id,
					expand.owner.username,
					expand.owner.is_ngo,
				`
			});

			const nearbyPosts = allPosts
				.filter((record) => {
					if (typeof record.lat !== 'number' || typeof record.lng !== 'number') {
						return false;
					}

					const postDistance = distance(latitude, longitude, record.lat, record.lng);

					return postDistance <= RADIUS_METERS;
				})
				.map((record) => ({
					...record,
					distance: distance(latitude, longitude, record.lat, record.lng)
				}));

			records = nearbyPosts;

			displayedRecords = records.slice(0, INITIAL_RESULTS);
		} catch (err: any) {
			console.error('Error loading posts:', err);
			toast.error('Could not load posts.');
		} finally {
			loading = false;
		}
	}

	function loadMore() {
		loadingMore = true;

		setTimeout(() => {
			const currentCount = displayedRecords.length;

			displayedRecords = records.slice(0, currentCount + LOAD_MORE_COUNT);

			loadingMore = false;
		}, 200);
	}

	function getImageUrl(record: any) {
		if (!record.image) return null;

		return `https://api.helplink.dev/api/files/j5eoavcdnn45xdq/${record.id}/${record.image}`;
	}

	function toggleDescription(id: string) {
		const newExpanded = new Set(expandedDescriptions);

		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}

		expandedDescriptions = newExpanded;
	}

	function isDescriptionExpanded(id: string) {
		return expandedDescriptions.has(id);
	}

	function getDescription(record: any) {
		const description = record.description || '';

		if (description.length <= DESCRIPTION_LIMIT || isDescriptionExpanded(record.id)) {
			return description;
		}

		return description.slice(0, DESCRIPTION_LIMIT).trimEnd() + '...';
	}

	function openImage(imageUrl: string) {
		selectedImage = imageUrl;

		// Prevent background page scrolling while lightbox is open
		document.body.style.overflow = 'hidden';
	}

	function closeImage() {
		selectedImage = null;

		// Restore page scrolling
		document.body.style.overflow = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && selectedImage) {
			closeImage();
		}
	}

	onMount(() => {
		if (!user) {
			toast.error('You must be logged in');
			goto('/login');
			return;
		}

		window.addEventListener('keydown', handleKeydown);

		const init = async () => {
			try {
				await getLocation();
				await loadPosts();
			} catch (err) {
				console.error('Location error:', err);
				toast.error('Could not get your location. Please enable location access.');
				loading = false;
			}
		};

		init();

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		};
	});
</script>

<div class="pt-8 pr-3 pl-3">
	<h1 class="title-font mt-4 ml-2 text-4xl">
		<b>Social.</b>
	</h1>

	<SideMenu />

	{#if loading}
		<div class="mt-10 flex justify-center">
			<Spinner class="h-8 w-8" />
		</div>
	{:else if records.length === 0}
		<div class="mt-10 text-center text-muted-foreground">
			<p>No posts found within 10 km of you.</p>
		</div>
	{:else}
		<div class="mx-auto mt-6 flex w-full max-w-md flex-col gap-5">
			{#each displayedRecords as record}
				{@const owner = record.expand?.owner}
				{@const imageUrl = getImageUrl(record)}
				{@const isExpanded = isDescriptionExpanded(record.id)}
				{@const hasLongDescription = (record.description?.length || 0) > DESCRIPTION_LIMIT}

				<Item.Root variant="outline" class="overflow-hidden rounded-2xl p-0">
					<Item.Content class="gap-0">
						<div class="p-4">
							<div class="mb-2 flex items-center gap-2">
								<button
									type="button"
									class="text-xs text-muted-foreground hover:underline"
									onclick={() => {
										if (owner?.username) {
											goto(`/profile/${owner.username}`);
										}
									}}
								>
									@{owner?.username || 'Unknown User'}
								</button>

								{#if record.by_ngo}
									<Badge variant="secondary" class="bg-blue-600 text-white dark:bg-blue-400">
										NGO
									</Badge>
								{:else}
									<Badge variant="secondary" class="bg-emerald-400 text-white">User</Badge>
								{/if}
							</div>

							<Separator class="mb-3" />

							<Item.Title class="title-font text-2xl">
								<b>{record.title}</b>
							</Item.Title>

							{#if imageUrl}
								<button
									type="button"
									class="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-xl p-0"
									onclick={() => openImage(imageUrl)}
									aria-label="Open image"
								>
									<img
										src={imageUrl}
										alt={record.title || 'Social post'}
										class="h-64 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
										loading="lazy"
									/>
								</button>
							{/if}

							<div class="mt-3">
								<p class="text-sm leading-relaxed text-muted-foreground">
									{getDescription(record)}
								</p>

								{#if hasLongDescription}
									<button
										type="button"
										class="mt-1 text-sm font-medium text-primary hover:underline"
										onclick={() => toggleDescription(record.id)}
									>
										{isExpanded ? 'Read less' : 'Read more'}
									</button>
								{/if}
							</div>
						</div>
					</Item.Content>
				</Item.Root>
			{/each}

			{#if displayedRecords.length < records.length}
				<Button class="mb-8 w-full" onclick={loadMore} disabled={loadingMore}>
					{#if loadingMore}
						<Spinner class="mr-2" />
						Loading...
					{:else}
						Load 10 More
					{/if}
				</Button>
			{:else}
				<p class="mb-8 text-center text-sm text-muted-foreground">You've reached the end.</p>
			{/if}
		</div>
	{/if}
</div>

<!-- Image Lightbox -->
{#if selectedImage}
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Image preview"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeImage();
			}
		}}
	>
		<button
			type="button"
			class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
			onclick={closeImage}
			aria-label="Close image"
		>
			×
		</button>

		<img
			src={selectedImage}
			alt="Expanded social post"
			class="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
			onclick={(event) => event.stopPropagation()}
		/>
	</div>
{/if}
