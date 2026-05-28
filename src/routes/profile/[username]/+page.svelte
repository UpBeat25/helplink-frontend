<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import Label from '$lib/components/ui/label/label.svelte';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import SideMenu from '$lib/components/menu.svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import type { RecordModel } from 'pocketbase';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';

	export let data;
	const { user } = data;

	let extras: RecordModel | null = null;
	const curr_user = pb.authStore.record;

	let editingDescription = false;
	let descriptionText = '';

	onMount(async () => {
		try {
			extras = await pb.collection('profile').getFirstListItem(`user = "${user.id}"`);
		} catch (err) {
			console.log('No profile found, creating one...');

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
	});

	async function saveDescription() {
		if (!extras) return;

		try {
			await pb.collection('profile').update(extras.id, {
				description: descriptionText
			});

			extras.description = descriptionText;
			editingDescription = false;
		} catch (err) {
			console.error(err);
		}
	}

	async function uploadAvatar(event: Event) {
		if (!extras) return;

		const input = event.target as HTMLInputElement;

		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];

		try {
			const updated = await pb.collection('profile').update(extras.id, {
				profile: file
			});

			extras = updated;
		} catch (err) {
			console.error(err);
		}
	}

	async function logout() {
		pb.authStore.clear();
		await goto('/login');
	}
</script>

<SideMenu />

<div class="flex min-h-screen items-center justify-center overflow-hidden">
	<div class="m-5 mx-auto w-98 space-y-8 p-6 font-mono">
		<Card.Root class="space-y-3 border-black bg-white p-6 text-black">
			<div class="items-center">
				<div class="relative mb-4 w-fit">
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
				<h1 class="text-xl font-bold">{user.name}</h1>
				<p class="text-sm">@{user.username}</p>
			</div>

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

			<div>
				<Badge>Karma: {user.karma}</Badge>

				{#if user.is_ngo}
					<Badge>Events Hosted: {user.events_attended}</Badge>

					<Badge variant="secondary" class="mt-1 bg-blue-500 text-white dark:bg-emerald-600">
						<BadgeCheckIcon />
						Verified NGO
					</Badge>
				{:else}
					<Badge>Events Attended: {user.events_attended}</Badge>
				{/if}

				<Badge class="mt-1" variant="secondary">
					Joined {new Date(user.created).toDateString()}
				</Badge>
			</div>
		</Card.Root>

		
		<div class="flex w-full gap-2">
			{#if curr_user?.id === user.id}
				<Button variant="ghost_logout" type="button" class="h-10 flex-1" onclick={logout}>
					<span style="color: red">Logout</span>
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
					<span style="color: red">Report User</span>
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
					class="absolute h-[3rem] w-[3rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0 text-black"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>
	</div>
</div>
