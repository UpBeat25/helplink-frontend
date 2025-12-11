<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import Arrow from '@lucide/svelte/icons/arrow-down';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import SideMenu from '$lib/components/menu.svelte';

	let { records } = $props();

	const user = pb.authStore.record;

	onMount(async () => {
		const user = pb.authStore.record;

		if (!user) {
			toast.error('You must be logged in');
			goto('/login');
			return;
		}

		await get_your_tasks(user);
	});

	async function get_your_tasks(user: any) {
		if (!user) return;

		const tasks = await pb.collection('tasks').getFullList({
			filter: `uploaded_by="${user.id}"`,
			sort: '-created'
		});

		for (let task of tasks) {
			const statusList = await pb.collection('status').getFullList({
				filter: `task="${task.id}"`,
				expand: 'user'
			});

			task.status_list = statusList;

			// NEW — all volunteers must be accepted
			task.allAccepted = statusList.length > 0 && statusList.every((s) => s.status === 'accepted');

			// NEW — all volunteers must be completed
			task.allCompleted =
				statusList.length > 0 && statusList.every((s) => s.status === 'completed');
		}

		records = tasks;
	}

	async function delete_all_status_for_task(taskId: string) {
		const statuses = await pb.collection('status').getFullList({
			filter: `task="${taskId}"`
		});

		for (let s of statuses) {
			await pb.collection('status').delete(s.id);
		}
	}

	async function delete_task(taskId: string) {
		try {
			await delete_all_status_for_task(taskId);
			await pb.collection('tasks').delete(taskId);
			toast.success(`Task Deleted`);
			get_your_tasks(user); // refresh
		} catch (e) {
			toast.error('Error deleting task');
		}
	}

	async function mark_completed(taskId: string) {
		if (!user) {
			return;
		}
		try {
			user.events_attended++;
			await delete_all_status_for_task(taskId);
			await pb.collection('tasks').delete(taskId);
			toast.success(`Task Completed`);
			get_your_tasks(user); // refresh
		} catch (e) {
			toast.error('Error deleting task');
		}
	}
</script>

<div class="pl-3 pr-3 pt-8 font-mono">
	<h1 class="mb-4 text-3xl"><b>Your Events</b></h1>
	<Separator />
	<SideMenu />

	{#if !records || records.length === 0}
		<div class="text-muted-foreground mt-8 flex items-center justify-center">
			<p>No active events uploaded by you...</p>
		</div>
	{/if}

	{#each records as record}
		<div class="flex w-full flex-col gap-2 px-4">
			<Collapsible.Root class="mx-auto w-full max-w-sm space-y-2">
				<Item.Root variant="outline">
					<Item.Content>
						<Item.Title>{record.title}</Item.Title>
					</Item.Content>

					{#if !record.allAccepted && !record.allCompleted}
						<Button variant="destructive" onclick={() => delete_task(record.id)}>
							Delete Event
						</Button>
					{:else}
						<!-- Show Mark as Complete only if all are accepted -->
						<Dialog.Root>
							<Dialog.Trigger><Button>Mark as Complete</Button></Dialog.Trigger>

							<Dialog.Content class="sm:max-w-[425px]">
								<Dialog.Header>
									<Dialog.Title>Make the Day More Memorable?</Dialog.Title>
									<Dialog.Description>
										This is completely optional but we would appreciate if you shared a selfie of
										you and the others to remember this day. Kindly attach the selfie with the
										instagram usernames of the the people so that they can be tagged.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-4 py-4">
									<div class="grid grid-cols-4 items-center gap-4">
										<a href="mailto:helplink2048@gmail.com" class="w-full">
											<Button>Email</Button>
										</a>
									</div>
								</div>
								<Dialog.Footer>
									<Button
										type="submit"
										onclick={() => {
											mark_completed(record.id);
										}}>Thank you!</Button
									>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
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
						{record.description}
					</div>

					<Label class="text-sm">Volunteers:</Label>
					<div class="text-sm">
						{#each record.status_list as status}
							<Item.Root variant="outline" class="rounded-xl p-3">
								<div class="grid w-full grid-cols-2 items-center">
									<!-- Left section -->
									<div class="flex-row">
										<div class="absolute">
											<a href={'/profile/' + status.expand.user.username}
												>{status.expand.user.username}</a
											>
											– {#if status.status === 'accepted'}
												Attendfing
											{:else}
												{status.status}
											{/if}
										</div>
										<br />
									</div>
								</div>
							</Item.Root>
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>
	{/each}
</div>
