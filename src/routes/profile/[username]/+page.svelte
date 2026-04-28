<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button/index.js';
	import Flag from '@lucide/svelte/icons/flag';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import Label from '$lib/components/ui/label/label.svelte';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import SideMenu from '$lib/components/menu.svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';

	export let data;
	const { user } = data;

	const curr_user = pb.authStore.record;
	async function logout() {
		pb.authStore.clear();
		await goto('/login');
	}
</script>

<SideMenu />

<div class="flex min-h-screen items-center justify-center overflow-hidden">
	<div class="m-5 mx-auto w-98 space-y-8 p-6 font-mono">
		<!-- Profile Header -->
		<Card.Root class="space-y-1 border-black p-6">
			<div class="items-center">
				<Avatar class="mb-4 h-30 w-30">
					<AvatarFallback class="text-4xl font-bold"
						>{user.username[0].toUpperCase()}</AvatarFallback
					>
				</Avatar>
				<h1 class="text-xl font-bold">{user.name}</h1>
				<p class="text-sm">@{user.username}</p>
			</div>
			<div>
				<Label><b>Date of Birth</b></Label>
				<p class="text-sm">
					{new Intl.DateTimeFormat('en-US', {
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					}).format(new Date(user.dob))}
				</p>
			</div>
			<div class="">
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
				<Badge class="mt-1" variant="secondary"
					>Joined {new Date(user.created).toDateString()}</Badge
				>
			</div>
		</Card.Root>
		{#if curr_user?.id === user.id}
			<div class="flex w-full gap-2">
				<Button variant="ghost_logout" type="button" class="h-10 flex-1" onclick={logout}
					><span style="color: red">Logout</span></Button
				>
				<Button
					class="h-10 flex-1 bg-red-500"
					onclick={() => {
						goto('mailto:helplink2048@gmail.com');
					}}>Report A Problem?</Button
				>
			</div>
		{:else}
			<div class="flex w-full gap-2">
				<Button
					variant="ghost_logout"
					type="button"
					class="h-10 flex-1"
					onclick={() => {
						goto('mailto:helplink2048@gmail.com');
					}}><span style="color: red">Report User</span></Button
				>
				<Button
					class="h-10 flex-1 bg-red-500"
					onclick={() => {
						goto('mailto:helplink2048@gmail.com');
					}}>Report A Problem?</Button
				>
			</div>
		{/if}
	</div>
</div>
