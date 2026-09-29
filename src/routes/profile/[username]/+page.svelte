<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import Label from '$lib/components/ui/label/label.svelte';

	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import Share2Icon from '@lucide/svelte/icons/share-2';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	import SideMenu from '$lib/components/menu.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import type { RecordModel } from 'pocketbase';
	import { toggleMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	const { user } = data;

	const curr_user = pb.authStore.record;

	// --------------------------------------------------
	// Profile
	// --------------------------------------------------

	let extras = $state<RecordModel | null>(null);

	let editingDescription = $state(false);
	let descriptionText = $state('');

	// --------------------------------------------------
	// Posts
	// --------------------------------------------------

	let posts = $state<any[]>([]);
	let displayedPosts = $state<any[]>([]);

	let postsLoading = $state(true);
	let loadingMore = $state(false);

	const POSTS_PER_LOAD = 5;

	let postsPage = $state(1);
	let postsTotal = $state(0);

	// --------------------------------------------------
	// Image lightbox
	// --------------------------------------------------

	let selectedImage = $state<string | null>(null);

	// --------------------------------------------------
	// Expanded descriptions
	// --------------------------------------------------

	let expandedDescriptions = $state<Set<string>>(new Set());

	const DESCRIPTION_LIMIT = 300;

	// --------------------------------------------------
	// Follow
	// --------------------------------------------------

	let isFollowing = $state(false);
	let followLoading = $state(false);

	// --------------------------------------------------
	// Followers / Following
	// --------------------------------------------------

	let followersCount = $state(0);
	let followingCount = $state(0);

	let showFollowModal = $state(false);
	let followModalType = $state<'followers' | 'following'>('followers');

	let followUsers = $state<any[]>([]);
	let followUsersLoading = $state(false);

	// --------------------------------------------------
	// Profile URL
	// --------------------------------------------------

	function getProfileUrl(username: string) {
		return `/profile/${encodeURIComponent(username)}`;
	}

	// --------------------------------------------------
	// Initial load
	// --------------------------------------------------

	onMount(() => {
		void (async () => {
			try {
				extras = await pb.collection('profile').getFirstListItem(`user = "${user.id}"`);
			} catch (err) {
				console.log('No profile found.');

				if (curr_user?.id === user.id) {
					try {
						extras = await pb.collection('profile').create({
							user: user.id,
							description: '',
							profile: null
						});
					} catch (createErr) {
						console.error(createErr);
					}
				}
			}

			loadPosts();
			loadFollowCounts();

			if (curr_user && curr_user.id !== user.id) {
				checkFollowStatus();
			}
		})();

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		};
	});

	// --------------------------------------------------
	// Posts
	// --------------------------------------------------

	async function loadPosts() {
		try {
			postsLoading = true;
			postsPage = 1;

			const result = await pb.collection('stories').getList(1, POSTS_PER_LOAD, {
				filter: `owner = "${user.id}"`,
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
					expand.owner.name
				`
			});

			posts = result.items;
			displayedPosts = result.items;
			postsTotal = result.totalItems;
		} catch (err) {
			console.error('Error loading posts:', err);

			posts = [];
			displayedPosts = [];
			postsTotal = 0;
		} finally {
			postsLoading = false;
		}
	}

	async function loadMorePosts() {
		if (loadingMore) return;

		if (displayedPosts.length >= postsTotal) {
			return;
		}

		try {
			loadingMore = true;

			const nextPage = postsPage + 1;

			const result = await pb.collection('stories').getList(nextPage, POSTS_PER_LOAD, {
				filter: `owner = "${user.id}"`,
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
					expand.owner.name
				`
			});

			posts = [...posts, ...result.items];
			displayedPosts = [...displayedPosts, ...result.items];

			postsPage = nextPage;
			postsTotal = result.totalItems;
		} catch (err) {
			console.error('Error loading more posts:', err);
			toast.error('Could not load more posts.');
		} finally {
			loadingMore = false;
		}
	}

	// --------------------------------------------------
	// Delete post
	// --------------------------------------------------

	async function deletePost(record: any) {
		if (curr_user?.id !== user.id) {
			return;
		}

		const confirmed = window.confirm(
			'Are you sure you want to delete this post? This cannot be undone.'
		);

		if (!confirmed) {
			return;
		}

		try {
			await pb.collection('stories').delete(record.id);

			posts = posts.filter((post) => post.id !== record.id);

			displayedPosts = displayedPosts.filter((post) => post.id !== record.id);

			postsTotal = Math.max(0, postsTotal - 1);

			const newExpanded = new Set(expandedDescriptions);
			newExpanded.delete(record.id);
			expandedDescriptions = newExpanded;

			toast.success('Post deleted.');
		} catch (err) {
			console.error('Error deleting post:', err);
			toast.error('Could not delete post.');
		}
	}

	// --------------------------------------------------
	// Description
	// --------------------------------------------------

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

	// --------------------------------------------------
	// Images
	// --------------------------------------------------

	function getImageUrl(record: any) {
		if (!record.image) {
			return null;
		}

		return `https://api.helplink.dev/api/files/j5eoavcdnn45xdq/${record.id}/${record.image}`;
	}

	function openImage(imageUrl: string) {
		selectedImage = imageUrl;
		document.body.style.overflow = 'hidden';
	}

	function closeImage() {
		selectedImage = null;

		if (!showFollowModal) {
			document.body.style.overflow = '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') {
			return;
		}

		if (selectedImage) {
			closeImage();
			return;
		}

		if (showFollowModal) {
			closeFollowModal();
		}
	}

	// --------------------------------------------------
	// Followers / Following counts
	// --------------------------------------------------

	async function loadFollowCounts() {
		try {
			const followers = await pb.collection('follows').getList(1, 1, {
				filter: `user = "${user.id}"`,
				fields: 'id'
			});

			const following = await pb.collection('follows').getList(1, 1, {
				filter: `follower = "${user.id}"`,
				fields: 'id'
			});

			followersCount = followers.totalItems;
			followingCount = following.totalItems;
		} catch (err) {
			console.error('Error loading follow counts:', err);

			followersCount = 0;
			followingCount = 0;
		}
	}

	// --------------------------------------------------
	// Followers / Following modal
	// --------------------------------------------------

	async function openFollowModal(type: 'followers' | 'following') {
		followModalType = type;

		showFollowModal = true;
		followUsers = [];
		followUsersLoading = true;

		document.body.style.overflow = 'hidden';

		try {
			if (type === 'followers') {
				const records = await pb.collection('follows').getFullList({
					filter: `user = "${user.id}"`,
					sort: '-created',
					expand: 'follower',
					fields: `
						id,
						user,
						follower,
						created,
						expand.follower.id,
						expand.follower.username,
						expand.follower.name,
						expand.follower.is_ngo
					`
				});

				followUsers = records.map((record) => record.expand?.follower).filter(Boolean);
			} else {
				const records = await pb.collection('follows').getFullList({
					filter: `follower = "${user.id}"`,
					sort: '-created',
					expand: 'user',
					fields: `
						id,
						user,
						follower,
						created,
						expand.user.id,
						expand.user.username,
						expand.user.name,
						expand.user.is_ngo
					`
				});

				followUsers = records.map((record) => record.expand?.user).filter(Boolean);
			}
		} catch (err) {
			console.error('Error loading followers/following:', err);

			followUsers = [];

			toast.error('Could not load this list.');
		} finally {
			followUsersLoading = false;
		}
	}

	function closeFollowModal() {
		showFollowModal = false;
		followUsers = [];

		if (!selectedImage) {
			document.body.style.overflow = '';
		}
	}

	function getFollowUserName(followUser: any) {
		return followUser?.name || followUser?.username || 'Unknown User';
	}

	function getFollowUserInitial(followUser: any) {
		return getFollowUserName(followUser).charAt(0).toUpperCase();
	}

	// --------------------------------------------------
	// Follow system
	// --------------------------------------------------

	async function checkFollowStatus() {
		if (!curr_user || curr_user.id === user.id) {
			return;
		}

		try {
			const existingFollow = await pb
				.collection('follows')
				.getFirstListItem(`user = "${user.id}" && follower = "${curr_user.id}"`);

			isFollowing = !!existingFollow;
		} catch (err) {
			isFollowing = false;
		}
	}

	async function toggleFollow() {
		if (!curr_user) {
			toast.error('You must be logged in to follow users.');

			goto('/login');
			return;
		}

		if (curr_user.id === user.id) {
			return;
		}

		try {
			followLoading = true;

			const existingFollow = await pb
				.collection('follows')
				.getFirstListItem(`user = "${user.id}" && follower = "${curr_user.id}"`)
				.catch(() => null);

			if (existingFollow) {
				await pb.collection('follows').delete(existingFollow.id);

				isFollowing = false;

				if (followersCount > 0) {
					followersCount -= 1;
				}
			} else {
				await pb.collection('follows').create({
					user: user.id,
					follower: curr_user.id
				});

				isFollowing = true;
				followersCount += 1;
			}
		} catch (err) {
			console.error('Follow error:', err);

			toast.error('Could not update follow status.');
		} finally {
			followLoading = false;
		}
	}

	// --------------------------------------------------
	// Share profile
	// --------------------------------------------------

	async function shareProfile() {
		const profileUrl = `https://helplink.dev/profile/${encodeURIComponent(user.username)}`;

		try {
			if (navigator.share) {
				await navigator.share({
					title: `${user.name || user.username} on HelpLink`,
					text: `Check out @${user.username} on HelpLink.`,
					url: profileUrl
				});

				return;
			}

			await navigator.clipboard.writeText(profileUrl);

			toast.success('Profile link copied!');
		} catch (err: any) {
			if (err?.name === 'AbortError') {
				return;
			}

			try {
				await navigator.clipboard.writeText(profileUrl);

				toast.success('Profile link copied!');
			} catch (clipboardErr) {
				console.error('Could not share profile:', clipboardErr);

				toast.error('Could not share profile.');
			}
		}
	}

	// --------------------------------------------------
	// Profile description
	// --------------------------------------------------

	async function saveDescription() {
		if (!extras) {
			return;
		}

		try {
			await pb.collection('profile').update(extras.id, {
				description: descriptionText
			});

			extras.description = descriptionText;
			editingDescription = false;

			toast.success('Description updated.');
		} catch (err) {
			console.error(err);

			toast.error('Could not update description.');
		}
	}

	// --------------------------------------------------
	// Avatar
	// --------------------------------------------------

	async function uploadAvatar(event: Event) {
		if (!extras) {
			return;
		}

		const input = event.target as HTMLInputElement;

		if (!input.files || input.files.length === 0) {
			return;
		}

		const file = input.files[0];

		try {
			const updated = await pb.collection('profile').update(extras.id, {
				profile: file
			});

			extras = updated;

			toast.success('Profile picture updated.');
		} catch (err) {
			console.error(err);

			toast.error('Could not update profile picture.');
		}
	}

	// --------------------------------------------------
	// Logout
	// --------------------------------------------------

	async function logout() {
		pb.authStore.clear();
		await goto('/login');
	}
</script>

<SideMenu />

<div class="min-h-screen px-3 pt-8">
	<div class="mx-auto w-full max-w-md space-y-6 p-2 font-mono">
		<!-- ==================================================
		     PROFILE
		================================================== -->

		<Card.Root class="space-y-3 border-black bg-white p-6 text-black">
			<!-- PFP + STATS -->

			<div class="flex items-center gap-5">
				<!-- AVATAR -->

				<div class="relative shrink-0">
					<Avatar.Root class="h-30 w-30 border-3 border-solid border-black">
						<Avatar.Image
							src={extras?.profile
								? pb.files.getURL(extras, extras.profile, {
										thumb: '200x200'
									})
								: ''}
							alt="@avatar"
							class="h-full w-full object-cover"
						/>

						<Avatar.Fallback class="text-4xl font-bold">
							{user.username[0].toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>

					{#if curr_user?.id === user.id}
						<label
							class="absolute right-0 bottom-0 cursor-pointer rounded-full bg-black px-2 py-1 text-xs text-white"
						>
							Edit

							<input type="file" accept="image/*" class="hidden" onchange={uploadAvatar} />
						</label>
					{/if}
				</div>

				<!-- FOLLOWER / FOLLOWING -->

				<div class="flex flex-1 items-center justify-around">
					<!-- FOLLOWERS -->

					<button
						type="button"
						class="flex min-w-0 flex-col items-center rounded-lg px-3 py-2 transition hover:bg-gray-100"
						onclick={() => openFollowModal('followers')}
					>
						<span class="text-lg font-bold">
							{followersCount}
						</span>

						<span class="text-xs text-gray-600"> Followers </span>
					</button>

					<!-- FOLLOWING -->

					<button
						type="button"
						class="flex min-w-0 flex-col items-center rounded-lg px-3 py-2 transition hover:bg-gray-100"
						onclick={() => openFollowModal('following')}
					>
						<span class="text-lg font-bold">
							{followingCount}
						</span>

						<span class="text-xs text-gray-600"> Following </span>
					</button>
				</div>
			</div>

			<!-- NAME + USERNAME + SHARE -->

			<div>
				<h1 class="text-xl font-bold">
					{user.name}
				</h1>

				<div class="mt-1 flex items-center gap-2">
					<a href={getProfileUrl(user.username)} class="text-sm text-gray-600 hover:underline">
						@{user.username}
					</a>

					<button
						type="button"
						class="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-gray-100"
						onclick={shareProfile}
						aria-label="Share profile"
						title="Share profile"
					>
						<Share2Icon class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- FOLLOW BUTTON -->

			{#if curr_user && curr_user.id !== user.id}
				<div class="mt-4">
					<Button
						class="w-full"
						variant={isFollowing ? 'outline' : 'default'}
						onclick={toggleFollow}
						disabled={followLoading}
					>
						{#if followLoading}
							<Spinner class="mr-2 h-4 w-4" />
							Please wait...
						{:else if isFollowing}
							<CheckIcon class="mr-2 h-4 w-4" />
							Following
						{:else}
							Follow
						{/if}
					</Button>
				</div>
			{/if}

			<!-- DESCRIPTION -->

			<div class="space-y-2">
				{#if editingDescription}
					<textarea
						bind:value={descriptionText}
						maxlength="200"
						rows="3"
						class="w-full rounded-md border p-2 text-sm"
						placeholder="Write something about yourself..."
					></textarea>

					<div class="flex items-center justify-between">
						<p class="text-xs text-gray-500">
							{descriptionText.length}/200
						</p>

						<div class="flex gap-2">
							<Button size="sm" onclick={saveDescription}>Save</Button>

							<Button
								size="sm"
								variant="outline"
								onclick={() => {
									editingDescription = false;
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-start gap-2">
						<p class="flex-1 text-sm">
							{extras?.description || 'No Description'}
						</p>

						{#if curr_user?.id === user.id}
							<Button
								variant="outline_bu"
								size="sm"
								class="cursor-pointer"
								onclick={() => {
									descriptionText = extras?.description || '';
									editingDescription = true;
								}}
							>
								Edit
							</Button>
						{/if}
					</div>
				{/if}
			</div>

			<!-- DATE -->

			<div>
				<Label>
					<b>
						{#if !user.is_ngo}
							Date of Birth
						{:else}
							Date of Joining
						{/if}
					</b>
				</Label>

				{#if user.dob}
					<p class="text-sm">
						{new Intl.DateTimeFormat('en-US', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						}).format(new Date(user.dob))}
					</p>
				{:else}
					<p class="text-sm">No date available</p>
				{/if}
			</div>

			<!-- BADGES -->

			<div>
				<Badge>
					Karma: {user.karma}
				</Badge>

				{#if user.is_ngo}
					<Badge>
						Events Hosted:
						{user.events_attended}
					</Badge>

					<Badge variant="secondary" class="mt-1 bg-blue-500 text-white dark:bg-emerald-600">
						<BadgeCheckIcon />
						Verified NGO
					</Badge>
				{:else}
					<Badge>
						Events Attended:
						{user.events_attended}
					</Badge>
				{/if}

				<Badge class="mt-1" variant="secondary">
					Joined
					{new Date(user.created).toDateString()}
				</Badge>
			</div>

			<!-- ACTION BUTTONS -->

			<div class="flex gap-2 pt-3">
				{#if curr_user?.id === user.id}
					<Button variant="ghost_logout" type="button" class="h-10 flex-1" onclick={logout}>
						<span style="color: red"> Logout </span>
					</Button>
				{:else}
					<Button
						variant="ghost_logout"
						type="button"
						class="h-10 flex-1"
						onclick={() => {
							window.location.href = 'mailto:helplink2048@gmail.com';
						}}
					>
						<span style="color: red"> Report </span>
					</Button>
				{/if}

				<Button
					class="h-10 flex-1 bg-red-500"
					onclick={() => {
						window.location.href = 'mailto:helplink2048@gmail.com';
					}}
				>
					Report A Problem?
				</Button>

				<Button onclick={toggleMode} variant="outline_bu" class="h-10">
					<SunIcon
						class="h-[3rem] w-[3rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
					/>

					<MoonIcon
						class="absolute h-[3rem] w-[3rem] scale-0 rotate-90 text-black !transition-all dark:scale-100 dark:rotate-0"
					/>

					<span class="sr-only"> Toggle theme </span>
				</Button>
			</div>
		</Card.Root>

		<!-- ==================================================
		     POSTS
		================================================== -->

		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<h2 class="text-2xl font-bold">Posts</h2>

				<Separator class="flex-1" />

				{#if !postsLoading}
					<span class="text-xs text-muted-foreground">
						{postsTotal}
					</span>
				{/if}
			</div>

			{#if postsLoading}
				<div class="flex justify-center py-8">
					<Spinner class="h-7 w-7" />
				</div>
			{:else if postsTotal === 0}
				<Card.Root class="p-6 text-center">
					<p class="text-sm text-muted-foreground">No posts yet.</p>
				</Card.Root>
			{:else}
				<div class="flex flex-col gap-4">
					{#each displayedPosts as record}
						{@const imageUrl = getImageUrl(record)}

						{@const isExpanded = isDescriptionExpanded(record.id)}

						{@const hasLongDescription = (record.description?.length || 0) > DESCRIPTION_LIMIT}

						<Card.Root class="items-home overflow-hidden rounded-2xl border p-0">
							<div class="p-4">
								<!-- POST HEADER -->

								<div class="mb-2 flex items-center justify-between gap-2">
									<div class="flex min-w-0 items-center gap-2">
										<a
											href={getProfileUrl(user.username)}
											class="truncate text-xs text-muted-foreground hover:underline"
										>
											@{user.username}
										</a>

										{#if record.by_ngo}
											<Badge variant="secondary" class="bg-blue-600 text-white dark:bg-blue-400">
												NGO
											</Badge>
										{:else}
											<Badge variant="secondary" class="bg-emerald-400 text-white">User</Badge>
										{/if}
									</div>

									<!-- DELETE -->

									{#if curr_user?.id === user.id}
										<button
											type="button"
											class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 hover:text-red-600"
											onclick={() => deletePost(record)}
											aria-label="Delete post"
											title="Delete post"
										>
											<Trash2Icon class="h-4 w-4" />
										</button>
									{/if}
								</div>

								<Separator class="mb-3" />

								<!-- TITLE -->

								<h3 class="title-font text-2xl font-bold">
									{record.title}
								</h3>

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

								<!-- DATE -->

								<p class="mt-3 text-xs text-muted-foreground">
									{new Date(record.created).toLocaleDateString('en-US', {
										day: 'numeric',
										month: 'long',
										year: 'numeric'
									})}
								</p>
							</div>
						</Card.Root>
					{/each}
				</div>

				<!-- LOAD MORE -->

				{#if displayedPosts.length < postsTotal}
					<Button class="w-full" onclick={loadMorePosts} disabled={loadingMore}>
						{#if loadingMore}
							<Spinner class="mr-2 h-4 w-4" />
							Loading...
						{:else}
							Load 5 More
						{/if}
					</Button>
				{:else}
					<p class="pb-2 text-center text-xs text-muted-foreground">You've reached the end.</p>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- ==================================================
     FOLLOWERS / FOLLOWING MODAL
================================================== -->

{#if showFollowModal}
	<div
		class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label={followModalType === 'followers' ? 'Followers' : 'Following'}
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeFollowModal();
			}
		}}
	>
		<div
			class="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
			onclick={(event) => event.stopPropagation()}
		>
			<!-- HEADER -->

			<div class="flex items-center justify-between border-b px-4 py-3">
				<div>
					<h3 class="text-lg font-bold">
						{followModalType === 'followers' ? 'Followers' : 'Following'}
					</h3>

					<p class="text-xs text-gray-500">
						{followModalType === 'followers' ? followersCount : followingCount}

						{followModalType === 'followers' ? ' followers' : ' following'}
					</p>
				</div>

				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-gray-100"
					onclick={closeFollowModal}
					aria-label="Close"
				>
					<XIcon class="h-5 w-5" />
				</button>
			</div>

			<!-- USERS -->

			<div class="overflow-y-auto p-2">
				{#if followUsersLoading}
					<div class="flex justify-center py-10">
						<Spinner class="h-7 w-7" />
					</div>
				{:else if followUsers.length === 0}
					<div class="py-10 text-center">
						<p class="text-sm text-gray-500">
							{followModalType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
						</p>
					</div>
				{:else}
					<div class="flex flex-col">
						{#each followUsers as followUser}
							<a
								href={getProfileUrl(followUser.username)}
								class="flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-gray-100"
								onclick={closeFollowModal}
							>
								<!-- AVATAR -->

								<Avatar.Root class="h-10 w-10 shrink-0">
									<Avatar.Fallback class="font-bold">
										{getFollowUserInitial(followUser)}
									</Avatar.Fallback>
								</Avatar.Root>

								<!-- NAME -->

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-1">
										<p class="truncate text-sm font-semibold">
											{getFollowUserName(followUser)}
										</p>

										{#if followUser.is_ngo}
											<BadgeCheckIcon class="h-4 w-4 shrink-0 text-blue-500" />
										{/if}
									</div>

									<p class="truncate text-xs text-gray-500">
										@{followUser.username}
									</p>
								</div>
							</a>
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
		tabindex="-1"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeImage();
			}
		}}
	>
		<button
			type="button"
			class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white transition hover:bg-white/20"
			onclick={closeImage}
			aria-label="Close image"
		>
			×
		</button>

		<img
			src={selectedImage}
			alt="Expanded social post"
			class="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
		/>
	</div>
{/if}
