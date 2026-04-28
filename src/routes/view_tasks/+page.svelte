<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SideMenu from '$lib/components/menu.svelte';
	import Arrow from '@lucide/svelte/icons/arrow-down';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import KarmaCounter from '$lib/components/karma.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';

	let { records } = $props();

	let ratings = $state<any>({});

	let privateNotes = $state<Record<string, string>>({});

	let openTaskId = $state<string | null>(null);

	let passcode = $state('');

	const user = pb.authStore.record;

	onMount(() => {
		if (!user) {
			toast.error('You must be logged in');
			goto('/login');
		}
	});

	async function get_tasks() {
		if (!user) return toast.error('You must be logged in');

		const fetchedRecords = await pb.collection('status').getFullList({
			filter: `user="${user.id}"`,
			sort: '-created',
			expand: 'task,task.uploaded_by',
			fields: `
			id,
			status,
			offer,
			expand.task.id,
			expand.task.title,
			expand.task.by_ngo,
			expand.task.description,
			expand.task.share_loc,
			expand.task.lat,
    		expand.task.lng,
			expand.task.uploaded_by,
			expand.task.expand.uploaded_by.id,
			expand.task.expand.uploaded_by.username
		`
		});

		// Initialize ratings for each task owner
		const newRatings: any = {};
		for (let record of fetchedRecords) {
			const ownerId = record.expand?.task?.uploaded_by;
			if (ownerId && !newRatings[ownerId]) {
				newRatings[ownerId] = 5; // Default rating
			}
		}

		ratings = newRatings;
		records = fetchedRecords;
		for (let record of fetchedRecords) {
			if (record.status === 'accepted') {
				await getPrivateNote(record.expand?.task.id);
			}
		}
	}
	get_tasks();

	async function getPrivateNote(taskId: string) {
		try {
			const task = await pb.collection('tasks').getOne(taskId, {
				fields: 'private_note'
			});

			privateNotes[taskId] = task.private_note;
		} catch (e) {
			console.error('Failed to fetch private note');
		}
	}
	async function remove_help(status_id: string) {
		if (!user) {
			toast.error('You must be logged in');
			goto('/login');
			return;
		}
		try {
			// 1. Delete status record
			await pb.collection('status').delete(status_id);

			toast.success('Success!');
			// 5. Refresh
			records = records.filter((r: any) => r.id !== status_id);
		} catch (e: any) {
			toast.error('Failed to cancel offer: ' + e.message);
			console.error(e);
		}
	}

	async function mark_completed_ngo(task_id: any, priv: any, ownerId: string) {
		if (!user) {
			return;
		}
		if (passcode === priv) {
			await pb.collection('users').update(ownerId, {
				events_attended: user.events_attended + 1
			});
			await mark_completed(task_id, ownerId);
		} else {
			toast.error('Incorrect Passcode');
		}

		passcode = '';
	}

	async function mark_completed(taskId: string, ownerId: string) {
		try {
			const statusRecord = await pb
				.collection('status')
				.getFirstListItem(`task = "${taskId}" && user = "${user?.id}"`);

			// Mark status as completed
			await pb.collection('status').update(statusRecord.id, {
				status: 'completed'
			});

			// Update the task owner's karma
			const owner = await pb.collection('users').getOne(ownerId);
			const newKarma = ratings[ownerId] || 5;

			await pb.collection('users').update(ownerId, {
				karma: owner.karma + newKarma
			});

			toast.success(`Task Completed & Rating Submitted`);

			await get_tasks();
		} catch (e) {
			toast.error('Error updating task status');
		}
	}
</script>

<div class="pt-8 pr-3 pl-3 font-mono">
	<h1 class="title-font mt-4 ml-2 text-4xl"><b>Your Offers.</b></h1>

	<SideMenu />

	{#if !records || records.length === 0}
		<div class="mt-8 flex items-center justify-center text-muted-foreground">
			<div>No offers made yet...</div>
		</div>
	{/if}

	{#each records as record}
		{@const task_id = record.expand.task.id}
		{@const task_title = record.expand.task.title}
		{@const task_by_ngo = record.expand.task.by_ngo}
		{@const task_description = record.expand.task.description}
		{@const owner = record.expand.task.expand.uploaded_by}
		<div class="flex w-full flex-col gap-2 px-4">
			<Collapsible.Root
				class="mx-auto w-full max-w-sm space-y-2"
				open={openTaskId === record.id}
				onOpenChange={(open) => {
					openTaskId = open ? record.id : null;
				}}
			>
				<Collapsible.Trigger class="w-full max-w-sm">
					<Item.Root variant="outline">
						<Item.Content>
							<div class="flex w-full gap-2">
								<Label
									style="cursor: pointer;"
									onclick={() => {
										goto(`/profile/${owner?.username}`);
									}}
									class="text-xs"
								>
									@{owner?.username || 'Unknown User'}
									-
								</Label>
								{#if !task_by_ngo}
									<Badge variant="secondary" class="mt-1 bg-emerald-400 text-white">Task</Badge>
								{:else}
									<Badge variant="secondary" class="mt-1 bg-blue-600 text-white dark:bg-blue-400">
										Event
									</Badge>
								{/if}
							</div>
							<Item.Title class="text-base">{task_title}</Item.Title>
							{#if !task_by_ngo}
								<Item.Description
									><b class="text-black">Status:</b>
									{#if record.status == 'accepted'}
										<span class="text-emerald-400">accepted</span>
									{:else if record.status == 'pending'}
										<span class="text-yellow-500">pending</span>
									{:else if record.status == 'rejected'}
										<span class="text-red-600">rejected</span>
									{:else}
										<span>completed</span>
									{/if}
								</Item.Description>
							{/if}
						</Item.Content>
					</Item.Root>
				</Collapsible.Trigger>

				<Collapsible.Content
					class="items-home w-full space-y-2 rounded-md border px-4 py-3 font-mono"
				>
					<Label>Description:</Label>
					<div class="text-sm text-muted-foreground">
						{task_description}
					</div>
					{#if !task_by_ngo}
						<Label class="text-sm">Your Offer:</Label>
						<div class="text-sm text-muted-foreground">
							{record.offer}
						</div>
					{/if}
					{#if record.status === 'accepted'}
						{@const task_private_note = privateNotes[task_id]}
						{@const task_share_loc = record.expand.task.share_loc}
						{#if !task_by_ngo}
							<Label>Private Note:</Label>
							<div class="text-sm text-muted-foreground">
								{task_private_note}
							</div>
						{/if}
						{#if task_share_loc}
							{@const task_lat = record.expand.task.lat}
							{@const task_lng = record.expand.task.lng}
							<Button class="w-full" href="https://www.google.com/maps?q={task_lat},{task_lng}">
								Location
							</Button>
						{/if}
						{#if !task_by_ngo}
							<Dialog.Root>
								<Dialog.Trigger class="w-full">
									<Button class="w-full bg-emerald-400">Mark as Complete</Button>
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Rate Task Owner</Dialog.Title>
										<Dialog.Description>
											Give karma (1–10) to {owner?.username}
										</Dialog.Description>
									</Dialog.Header>

									<div class="flex w-full items-center justify-center rounded-xl border p-4">
										<KarmaCounter bind:value={ratings[owner.id]} />
									</div>

									<Dialog.Footer class="mt-4">
										<Dialog.Close>
											<Button onclick={() => mark_completed(task_id, owner?.id)}>
												Submit Rating
											</Button>
										</Dialog.Close>
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
						{/if}

						{#if task_by_ngo}
							{@const priv = privateNotes[task_id]}
							<Dialog.Root>
								<Dialog.Trigger class="w-full">
									<Button class="w-full bg-blue-600 dark:bg-blue-400">Mark as Complete</Button>
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Rate the Event</Dialog.Title>
										<Dialog.Description>
											Give karma (1–10) to {owner?.username}'s event
										</Dialog.Description>
									</Dialog.Header>

									<div class="flex w-full items-center justify-center rounded-xl p-4">
										<KarmaCounter bind:value={ratings[owner.id]} />
									</div>

									<Input class="items-home" bind:value={passcode} placeholder="Enter Event Passcode..." />

									<Dialog.Footer class="mt-4">
										<Dialog.Close>
											<Button onclick={() => mark_completed_ngo(task_id, priv, owner?.id)}>
												Submit
											</Button>
										</Dialog.Close>
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
						{/if}
					{/if}

					{#if record.status === 'pending'}
						<Dialog.Root>
							<Dialog.Trigger class="w-full">
								<Button class="w-full" variant="destructive">
									Remove {#if !task_by_ngo}Help{:else}Event{/if}
								</Button>
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
									<Dialog.Description>This action cannot be undone.</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close>
										<Button
											class="w-full"
											variant="destructive"
											type="submit"
											onclick={() => remove_help(record.id)}
										>
											Yes, Confirm
										</Button>
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</Collapsible.Content>
				<span></span>
			</Collapsible.Root>
		</div>
	{/each}
</div>
