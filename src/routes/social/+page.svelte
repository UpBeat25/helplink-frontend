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
	import * as Avatar from '$lib/components/ui/avatar';

	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';

	const user = pb.authStore.record;

	// ==================================================
	// POSTS
	// ==================================================

	let records = $state<any[]>([]);
	let displayedRecords = $state<any[]>([]);

	let loading = $state(true);
	let loadingMore = $state(false);

	const INITIAL_RESULTS = 10;
	const LOAD_MORE_COUNT = 10;

	// ==================================================
	// LOCATION
	// ==================================================

	let latitude = $state(0);
	let longitude = $state(0);

	const RADIUS_METERS = 10000;

	// ==================================================
	// FOLLOWING
	// ==================================================

	let followingIds = $state<string[]>([]);

	// ==================================================
	// IMAGE LIGHTBOX
	// ==================================================

	let selectedImage = $state<string | null>(null);

	// ==================================================
	// DESCRIPTIONS
	// ==================================================

	let expandedDescriptions = $state<Set<string>>(new Set());

	const DESCRIPTION_LIMIT = 300;

	// ==================================================
	// SEARCH
	// ==================================================

	let showSearch = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searching = $state(false);
	let searchHasSearched = $state(false);

	/*
	 * Used to make sure an older search request
	 * cannot overwrite newer results.
	 */
	let searchRequestId = 0;

	// ==================================================
	// DISTANCE
	// ==================================================

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

	// ==================================================
	// LOCATION
	// ==================================================

	function getLocation(): Promise<{
		lat: number;
		lng: number;
	}> {
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
					enableHighAccuracy: false,
					timeout: 7000,
					maximumAge: 300000
				}
			);
		});
	}

	// ==================================================
	// LOAD FOLLOWING
	// ==================================================

	async function loadFollowing() {
		if (!user) {
			return;
		}

		try {
			const follows = await pb.collection('follows').getFullList({
				filter: `follower = "${user.id}"`,
				fields: 'user'
			});

			followingIds = follows.map((record) => record.user).filter(Boolean);
		} catch (err) {
			console.error('Error loading following:', err);

			followingIds = [];
		}
	}

	// ==================================================
	// BUILD FOLLOWING FILTER
	// ==================================================

	function buildFollowingFilter() {
		if (followingIds.length === 0) {
			return '';
		}

		return followingIds.map((id) => `owner = "${id}"`).join(' || ');
	}

	// ==================================================
	// LOAD POSTS
	// ==================================================

	async function loadPosts() {
		if (!user) {
			goto('/login');
			return;
		}

		try {
			loading = true;

			/*
			 * ------------------------------------------------
			 * Calculate geographic bounding box.
			 * ------------------------------------------------
			 */

			const latDelta = RADIUS_METERS / 111320;

			const lngDelta = RADIUS_METERS / (111320 * Math.cos((latitude * Math.PI) / 180));

			const minLat = latitude - latDelta;

			const maxLat = latitude + latDelta;

			const minLng = longitude - lngDelta;

			const maxLng = longitude + lngDelta;

			/*
			 * ------------------------------------------------
			 * Two-day cutoff.
			 * ------------------------------------------------
			 */

			const twoDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

			/*
			 * ------------------------------------------------
			 * Nearby posts can be any age.
			 *
			 * Followed-user posts must be recent.
			 * ------------------------------------------------
			 */

			const nearbyFilter = `
				lat >= ${minLat} &&
				lat <= ${maxLat} &&
				lng >= ${minLng} &&
				lng <= ${maxLng}
			`
				.replace(/\s+/g, ' ')
				.trim();

			const followingFilter =
				followingIds.length > 0 ? followingIds.map((id) => `owner = "${id}"`).join(' || ') : '';

			let filter = '';

			if (followingFilter) {
				filter = `
					(${nearbyFilter}) ||
					((${followingFilter}) && created >= "${twoDaysAgo}")
				`
					.replace(/\s+/g, ' ')
					.trim();
			} else {
				filter = nearbyFilter;
			}

			/*
			 * ------------------------------------------------
			 * Get a limited batch.
			 * ------------------------------------------------
			 */

			const result = await pb.collection('stories').getList(1, 100, {
				filter,
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
								by_ngo,
								expand.owner.id,
								expand.owner.username,
								expand.owner.is_ngo,
								expand.owner.name
							`
			});

			/*
			 * ------------------------------------------------
			 * Exact distance filtering.
			 * ------------------------------------------------
			 */

			const processedPosts = result.items
				.map((record) => {
					if (typeof record.lat !== 'number' || typeof record.lng !== 'number') {
						return null;
					}

					const postDistance = distance(latitude, longitude, record.lat, record.lng);

					const isFollowed = followingIds.includes(record.owner);

					const isNearby = postDistance <= RADIUS_METERS;

					const isRecent =
						new Date(record.created).getTime() >= Date.now() - 2 * 24 * 60 * 60 * 1000;

					/*
					 * Nearby posts can be any age.
					 */
					if (isNearby) {
						return {
							...record,
							distance: postDistance,
							isFollowed,
							isNearby,
							isRecent
						};
					}

					/*
					 * Followed posts outside the radius
					 * must be recent.
					 */
					if (isFollowed && isRecent) {
						return {
							...record,
							distance: postDistance,
							isFollowed,
							isNearby,
							isRecent
						};
					}

					return null;
				})
				.filter(Boolean);

			/*
			 * Newest posts first.
			 */
			processedPosts.sort(
				(a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime()
			);

			records = processedPosts as any[];

			displayedRecords = records.slice(0, INITIAL_RESULTS);
		} catch (err: any) {
			console.error('Error loading posts:', err);

			records = [];
			displayedRecords = [];
		} finally {
			loading = false;
		}
	}

	// ==================================================
	// LOAD MORE
	// ==================================================

	function loadMore() {
		if (loadingMore) {
			return;
		}

		if (displayedRecords.length >= records.length) {
			return;
		}

		loadingMore = true;

		setTimeout(() => {
			const currentCount = displayedRecords.length;

			displayedRecords = records.slice(0, currentCount + LOAD_MORE_COUNT);

			loadingMore = false;
		}, 100);
	}

	// ==================================================
	// IMAGE URL
	// ==================================================

	function getImageUrl(record: any) {
		if (!record.image) {
			return null;
		}

		/*
		 * Request a resized version rather than
		 * downloading the original full-resolution image.
		 *
		 * 800x600 is more than enough for the feed
		 * while keeping bandwidth considerably lower.
		 */
		return `https://api.helplink.dev/api/files/j5eoavcdnn45xdq/${record.id}/${record.image}?thumb=800x600`;
	}

	// ==================================================
	// PROFILE IMAGE URL
	// ==================================================

	function getProfileImageUrl(searchUser: any) {
		if (!searchUser?.profile) {
			return null;
		}

		return `https://api.helplink.dev/api/files/_pb_users_auth_/${searchUser.id}/${searchUser.profile}?thumb=150x150`;
	}

	// ==================================================
	// DESCRIPTION
	// ==================================================

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

	// ==================================================
	// IMAGE LIGHTBOX
	// ==================================================

	function openImage(imageUrl: string) {
		/*
		 * Remove the thumbnail parameter for the
		 * lightbox so the full image is loaded only
		 * when the user explicitly opens it.
		 */
		selectedImage = imageUrl.replace('?thumb=800x600', '');

		document.body.style.overflow = 'hidden';
	}

	function closeImage() {
		selectedImage = null;

		if (!showSearch) {
			document.body.style.overflow = '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (selectedImage) {
				closeImage();
			} else if (showSearch) {
				closeSearch();
			}
		}
	}

	// ==================================================
	// USER SEARCH
	// ==================================================

	function openSearch() {
		showSearch = true;
		searchQuery = '';
		searchResults = [];
		searchHasSearched = false;
		searchRequestId++;

		document.body.style.overflow = 'hidden';
	}

	function closeSearch() {
		showSearch = false;
		searchQuery = '';
		searchResults = [];
		searchHasSearched = false;
		searchRequestId++;

		if (!selectedImage) {
			document.body.style.overflow = '';
		}
	}

	async function searchUsers() {
		if (searchQuery.trim().length < 2) {
			searchResults = [];
			searchHasSearched = false;
			return;
		}

		const requestId = ++searchRequestId;
		searching = true;
		searchHasSearched = true;

		try {
			const users = await pb.collection('users').getList(1, 5, {
				filter: `username ~ "${searchQuery.trim().replace(/"/g, '\\"')}"`,
				sort: 'username',
				fields: 'id,username,name,is_ngo'
			});

			// Fetch profile records for these users
			const userIds = users.items.map((user) => user.id);

			let profiles: any[] = [];

			if (userIds.length > 0) {
				const profileFilters = userIds.map((id) => `user = "${id}"`).join(' || ');

				const profileResult = await pb.collection('profile').getFullList({
					filter: profileFilters,
					fields: 'user,profile'
				});

				profiles = profileResult;
			}

			// Ignore this response if a newer search has already started
			if (requestId !== searchRequestId) return;

			searchResults = users.items.map((user) => {
				const profile = profiles.find((p) => p.user === user.id);

				return {
					...user,
					profileImage: profile?.profile || null
				};
			});
		} catch (error) {
			if (requestId === searchRequestId) {
				console.error('Search failed:', error);
				searchResults = [];
			}
		} finally {
			if (requestId === searchRequestId) {
				searching = false;
			}
		}
	}

	// ==================================================
	// SEARCH USER HELPERS
	// ==================================================

	function getUserName(searchUser: any) {
		return searchUser?.name || searchUser?.username || 'Unknown User';
	}

	function getUserInitial(searchUser: any) {
		return getUserName(searchUser).charAt(0).toUpperCase();
	}

	function openUserProfile(username: string) {
		closeSearch();

		goto(`/profile/${username}`);
	}

	// ==================================================
	// INITIALIZATION
	// ==================================================

	onMount(() => {
		if (!user) {
			toast.error('You must be logged in');

			goto('/login');

			return;
		}

		window.addEventListener('keydown', handleKeydown);

		const init = async () => {
			try {
				/*
				 * Location and following are
				 * independent requests.
				 */
				await Promise.all([getLocation(), loadFollowing()]);

				await loadPosts();
			} catch (err) {
				console.error('Social initialization error:', err);

				toast.error('Could not load your social feed.');

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
	<!-- ==================================================
	     HEADER
	================================================== -->

	<div class="mx-auto flex w-full max-w-md items-center justify-between">
		<h1 class="title-font mt-4 ml-2 text-4xl">
			<b>Social.</b>
		</h1>

		<Button
			variant="outline"
			size="icon"
			class="mt-4"
			onclick={openSearch}
			aria-label="Search users"
			title="Search users"
		>
			<SearchIcon class="h-5 w-5" />
		</Button>
	</div>

	<SideMenu />

	<!-- ==================================================
	     LOADING
	================================================== -->

	{#if loading}
		<div class="mt-10 flex flex-col items-center justify-center gap-3">
			<Spinner class="h-8 w-8" />

			<p class="text-xs text-muted-foreground">Loading your feed...</p>
		</div>

		<!-- ==================================================
	     EMPTY
	================================================== -->
	{:else if records.length === 0}
		<div class="mt-10 text-center text-muted-foreground">
			<p>No posts found nearby or from people you follow.</p>
		</div>

		<!-- ==================================================
	     POSTS
	================================================== -->
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
							<!-- POST HEADER -->

							<div class="mb-2 flex items-center justify-between gap-2">
								<div class="flex min-w-0 items-center gap-2">
									<button
										type="button"
										class="truncate text-xs text-muted-foreground hover:underline"
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

									{#if record.isFollowed}
										<Badge variant="outline" class="text-xs">Following</Badge>
									{/if}
								</div>
							</div>

							<Separator class="mb-3" />

							<!-- TITLE -->

							<Item.Title class="title-font text-2xl">
								<b>
									{record.title}
								</b>
							</Item.Title>

							<!-- IMAGE -->

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
										class="w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
										loading="lazy"
									/>
								</button>
							{/if}

							<!-- DESCRIPTION -->

							{#if record.description}
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
							{/if}

							<!-- POST INFO -->

							<div class="mt-3 flex items-center justify-between gap-2">
								<p class="text-xs text-muted-foreground">
									{new Date(record.created).toLocaleDateString('en-US', {
										day: 'numeric',
										month: 'long',
										year: 'numeric'
									})}
								</p>

								{#if record.isNearby}
									<p class="text-xs text-muted-foreground">
										{record.distance < 1000
											? `${Math.round(record.distance)} m away`
											: `${(record.distance / 1000).toFixed(1)} km away`}
									</p>
								{:else if record.isFollowed}
									<p class="text-xs text-muted-foreground">Following</p>
								{/if}
							</div>
						</div>
					</Item.Content>
				</Item.Root>
			{/each}

			<!-- ==================================================
			     LOAD MORE
			================================================== -->

			{#if displayedRecords.length < records.length}
				<Button class="mb-8 w-full" onclick={loadMore} disabled={loadingMore}>
					{#if loadingMore}
						<Spinner class="mr-2 h-4 w-4" />
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

<!-- ==================================================
     USER SEARCH MODAL
================================================== -->

{#if showSearch}
	<div
		class="fixed inset-0 z-[9998] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Search users"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeSearch();
			}
		}}
	>
		<div
			class="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
			onclick={(event) => event.stopPropagation()}
		>
			<!-- SEARCH HEADER -->

			<div class="flex items-center gap-2 border-b p-3">
				<div class="flex h-10 flex-1 items-center rounded-lg border px-3">
					<SearchIcon class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search username..."
						class="h-full w-full bg-transparent text-sm outline-none"
						autofocus
						oninput={searchUsers}
					/>
				</div>

				<button
					type="button"
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-gray-100"
					onclick={closeSearch}
					aria-label="Close search"
				>
					<XIcon class="h-5 w-5" />
				</button>
			</div>

			<!-- SEARCH RESULTS -->

			<div class="overflow-y-auto p-2">
				{#if searching}
					<div class="flex justify-center py-10">
						<Spinner class="h-7 w-7" />
					</div>
				{:else if !searchHasSearched}
					<div class="py-10 text-center">
						<SearchIcon class="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

						<p class="text-sm text-muted-foreground">Type at least 2 characters to search</p>
					</div>
				{:else if searchResults.length === 0}
					<div class="py-10 text-center">
						<p class="text-sm text-muted-foreground">No users found.</p>
					</div>
				{:else}
					<div class="flex flex-col">
						{#each searchResults as searchUser}
							{@const profileImage = getProfileImageUrl(searchUser)}

							<button
								type="button"
								class="flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-gray-100"
								onclick={() => openUserProfile(searchUser.username)}
							>
								<!-- AVATAR -->

								<Avatar.Root class="h-11 w-11 shrink-0 overflow-hidden border">
									{#if profileImage}
										<Avatar.Image src={profileImage} alt={getUserName(searchUser)} />
									{/if}

									<Avatar.Fallback class="font-bold">
										{getUserInitial(searchUser)}
									</Avatar.Fallback>
								</Avatar.Root>

								<!-- USER INFO -->

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-1">
										<p class="truncate text-sm font-semibold">
											{getUserName(searchUser)}
										</p>

										{#if searchUser.is_ngo}
											<BadgeCheckIcon class="h-4 w-4 shrink-0 text-blue-500" />
										{/if}
									</div>

									<p class="truncate text-xs text-muted-foreground">
										@{searchUser.username}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- ==================================================
     IMAGE LIGHTBOX
================================================== -->

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
