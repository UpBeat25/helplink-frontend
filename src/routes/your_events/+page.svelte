<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import Arrow from '@lucide/svelte/icons/arrow-down';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import SideMenu from '$lib/components/menu.svelte';

	let { records } = $props();

	const user = pb.authStore.record;

	let openTaskId = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const user = pb.authStore.record;

		if (!user) {
			toast.error('You must be logged in');
			goto('/login');
			loading = false;
			return;
		}

		try {
			await get_your_tasks(user);
		} catch (e) {
			console.error('Error loading your events:', e);
			toast.error('Could not load your events');
		} finally {
			loading = false;
		}
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

			// All volunteers must be accepted
			task.allAccepted = statusList.length > 0 && statusList.every((s) => s.status === 'accepted');

			// All volunteers must be completed
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

			toast.success('Task Deleted');

			await get_your_tasks(user);
		} catch (e) {
			console.error(e);
			toast.error('Error deleting task');
		}
	}

	async function mark_completed(taskId: string, post: boolean = false) {
		if (!user) {
			return;
		}

		try {
			await pb.collection('users').update(user.id, {
				events_attended: user.events_attended + 1
			});

			await delete_all_status_for_task(taskId);
			await pb.collection('tasks').delete(taskId);

			toast.success('Task Completed');

			await get_your_tasks(user);

			if (post) {
				goto('/post');
			}
		} catch (e) {
			console.error(e);
			toast.error('Error completing task');
		}
	}
</script>

<div class="pt-8 pr-3 pl-3 font-mono">
	<h1 class="title-font mt-4 ml-2 text-4xl"><b>Your Events.</b></h1>
	<SideMenu />

	{#if loading}
		<div class="mt-10 flex items-center justify-center">
			<Spinner class="h-8 w-8" />
		</div>
	{:else}
		{#if !records || records.length === 0}
			<div class="mt-8 flex items-center justify-center text-muted-foreground">
				<p>No active events uploaded by you...</p>
			</div>
		{/if}

		{#each records as record}
			<div class="flex w-full flex-col gap-2 px-4">
				<Collapsible.Root
					class="mx-auto w-full max-w-sm space-y-2"
					open={openTaskId === record.id}
					onOpenChange={(open) => {
						openTaskId = open ? record.id : null;
					}}
				>
					<Item.Root variant="outline">
						<Item.Content>
							<Item.Title>{record.title}</Item.Title>
						</Item.Content>

						<div class="flex w-full gap-2">
							<Item.Actions>
								<Collapsible.Trigger>
									<Button size="icon" variant="outline" class="rounded-full">
										<Arrow />
									</Button>
								</Collapsible.Trigger>
							</Item.Actions>

							{#if !record.allAccepted && !record.allCompleted}
								<Button variant="destructive" onclick={() => delete_task(record.id)}>
									Delete Event
								</Button>
							{:else}
								<Dialog.Root>
									<Dialog.Trigger>
										<Button>Mark as Complete</Button>
									</Dialog.Trigger>

									<Dialog.Content class="sm:max-w-[425px]">
										<Dialog.Header>
											<Dialog.Title>Make the Day More Memorable?</Dialog.Title>
											<Dialog.Description>
												Post a story and share your experience with the world! This is completely
												optional
											</Dialog.Description>
										</Dialog.Header>

										<div class="grid gap-4 py-4">
											<Button
												type="submit"
												onclick={() => {
													mark_completed(record.id, true);
												}}
											>
												Post
											</Button>
										</div>

										<Dialog.Footer>
											<Button
												type="submit"
												onclick={() => {
													mark_completed(record.id);
												}}
											>
												Complete without posting
											</Button>
										</Dialog.Footer>
									</Dialog.Content>
								</Dialog.Root>
							{/if}
						</div>
					</Item.Root>

					<Collapsible.Content
						class="items-home w-full space-y-2 rounded-md border px-4 py-3 font-mono"
					>
						<Label>Description:</Label>

						<div class="text-sm text-muted-foreground">
							{record.description}
						</div>

						<Label class="text-sm">Volunteers:</Label>

						<div class="text-sm">
							{#each record.status_list as status}
								<Item.Root variant="outline" class="rounded-xl p-3">
									<div class="grid w-full grid-cols-2 items-center">
										<div class="flex-row">
											<div class="absolute">
												<a href={'/profile/' + status.expand.user.username}>
													{status.expand.user.username}
												</a>
												–
												{#if status.status === 'accepted'}
													Attending
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
	{/if}
</div>
