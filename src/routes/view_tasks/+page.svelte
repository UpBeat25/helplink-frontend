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

	let { records } = $props();

	let ratings = $state<any>({});

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
			expand: 'task,task.uploaded_by'
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
	}
	get_tasks();

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

	async function mark_completed_ngo(task: any, ownerId: string) {
    	if (!user) {
			return;
		}
		if (passcode === task.private_note) {
      		user.events_attended++;
			await mark_completed(task.id, ownerId);
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

			// Update the task owner's karma
			const owner = await pb.collection('users').getOne(ownerId);
			const newKarma = ratings[ownerId] || 5;

			await pb.collection('users').update(ownerId, {
				karma: owner.karma + newKarma
			});

			// Mark status as completed
			await pb.collection('status').update(statusRecord.id, {
				status: 'completed'
			});

			toast.success(`Task Completed & Rating Submitted`);

			await get_tasks();
		} catch (e) {
			toast.error('Error updating task status');
		}
	}
</script>

<div class="pl-3 pr-3 pt-8 font-mono">
	<h1 class="mb-4 text-3xl"><b>View Tasks</b></h1>
	<Separator />
	<SideMenu />

	{#if !records || records.length === 0}
		<div class="text-muted-foreground mt-8 flex items-center justify-center">
			<div>No offers made yet...</div>
		</div>
	{/if}

	{#each records as record}
		{@const task = record.expand.task}
		{@const owner = task?.expand?.uploaded_by}
		<div class="flex w-full flex-col gap-2 px-4">
			<Collapsible.Root class="mx-auto w-full max-w-sm space-y-2">
				<Item.Root variant="outline">
					{#if !task.by_ngo}
						<Item.Media
							onclick={() => {
								goto(`/profile/${owner?.username}`);
							}}
						>
							<Avatar.Root class="size-10">
								<Avatar.Fallback>{owner?.username?.[0]?.toUpperCase()}</Avatar.Fallback>
							</Avatar.Root>
						</Item.Media>
					{/if}

					<Item.Content>
						{#if !task.by_ngo}
							<Item.Title>{task.title}</Item.Title>
							<Item.Description>Status: {task.status}</Item.Description>
						{:else}
							<Item.Title><b class="text-yellow-300">Event: </b>{task.title}</Item.Title>
						{/if}
					</Item.Content>
					{#if record.status == 'accepted' && !task.by_ngo}
						<div class="flex justify-end">
							<Dialog.Root>
								<Dialog.Trigger>
									<Button>Mark as Complete</Button>
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Rate Task Owner</Dialog.Title>
										<Dialog.Description>
											Give karma (1–10) to {owner?.username}
										</Dialog.Description>
									</Dialog.Header>

									<div class="rounded-xl border p-4">
										<KarmaCounter bind:value={ratings[owner?.id]} />
									</div>

									<Dialog.Footer class="mt-4">
										<Dialog.Close>
											<Button onclick={() => mark_completed(task.id, owner?.id)}>
												Submit Rating
											</Button>
										</Dialog.Close>
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
						</div>
					{/if}

					<Item.Actions>
						<Collapsible.Trigger>
							<Button size="icon" variant="outline" class="rounded-full">
								<Arrow />
							</Button>
						</Collapsible.Trigger>
					</Item.Actions>
				</Item.Root>

				<Collapsible.Content class="w-full space-y-2 rounded-md border px-4 py-3 font-mono">
					<Label>Description:</Label>
					<div class="text-muted-foreground text-sm">
						{task?.description}
					</div>
					{#if !task.by_ngo}
						<Label class="text-sm">Your Offer:</Label>
						<div class="text-muted-foreground text-sm">
							{record.offer}
						</div>
					{/if}
					{#if record.status === 'accepted'}
						{#if !task.by_ngo}
							<Label>Private Note:</Label>
							<div class="text-muted-foreground text-sm">
								{task?.private_note}
							</div>
						{/if}
						<Label>Posted by: {owner?.username}</Label>
						{#if task.share_loc}
							<Button class="w-full" href="https://www.google.com/maps?q={task.lat},{task.lng}">
								Location
							</Button>
						{/if}

						{#if task.by_ngo}
							<Dialog.Root>
								<Dialog.Trigger class="w-full">
									<Button class="w-full bg-yellow-300">Mark as Complete</Button>
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Rate the Event</Dialog.Title>
										<Dialog.Description>
											Give karma (1–10) to {owner?.username}'s event
										</Dialog.Description>
									</Dialog.Header>

									<div class="rounded-xl border p-4">
										<KarmaCounter bind:value={ratings[owner?.id]} />
									</div>
                  
									<Input bind:value={passcode} placeholder="Enter Event Passcode..." />

									<Dialog.Footer class="mt-4">
										<Dialog.Close>
											<Button onclick={() => mark_completed_ngo(task, owner?.id)}>
												Submit Rating
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
									Remove {#if !task.by_ngo}Help{:else}Event{/if}
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
			</Collapsible.Root>
		</div>
	{/each}
</div>
