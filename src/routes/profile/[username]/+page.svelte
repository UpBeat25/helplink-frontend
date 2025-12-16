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

	export let data;
	const { user } = data;
</script>

<SideMenu />
<div class="flex min-h-screen items-center justify-center overflow-hidden">
	<div class="w-98 m-5 mx-auto space-y-8 p-6 font-mono">
		<!-- Profile Header -->
		<Card.Root class="space-y-1 p-6">
			<div class="items-center">
				<Avatar class="w-30 h-30 mb-4">
					<AvatarFallback class="text-4xl font-bold"
						>{user.username[0].toUpperCase()}</AvatarFallback
					>
				</Avatar>
				<h1 class="text-xl font-bold">{user.name}</h1>
				<p class="text-muted-foreground text-sm">@{user.username}</p>
			</div>
			<div>
				<Label>Date of Birth</Label>
				<p class="text-muted-foreground text-sm">
					{new Intl.DateTimeFormat('en-US', {
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					}).format(new Date(user.dob))}
				</p>
			</div>
			<Separator />
			<div class="">
				<Badge>Karma: {user.karma}</Badge>
				{#if user.is_ngo}
					<Badge>Events Hosted: {user.events_attended}</Badge>
					<Badge variant="secondary" class="bg-blue-500 text-white dark:bg-emerald-600 mt-1">
						<BadgeCheckIcon />
						Verified NGO
					</Badge>
				{:else}
					<Badge>Events Attended: {user.events_attended}</Badge>
				{/if}
				<Badge class="mt-1" variant="secondary">Joined {new Date(user.created).toDateString()}</Badge>
			</div>
		</Card.Root>
		<Button
			class="h-10 w-10 bg-red-500"
			onclick={() => {
				goto('mailto:helplink2048@gmail.com');
			}}><Flag /></Button
		>
	</div>
</div>
