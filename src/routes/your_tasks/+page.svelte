<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
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
	import SideMenu from '$lib/components/menu.svelte';

	let ratings = $state<any>({});
	let { records } = $props();

	const user = pb.authStore.record;

	let openTaskId = $state<string | null>(null);

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

		const newRatings: any = {};

		for (let task of tasks) {
			const statusList = await pb.collection('status').getFullList({
				filter: `task="${task.id}"`,
				expand: 'user'
			});

			task.status_list = statusList;

			// Default ratings
			for (let status of statusList) {
				newRatings[status.id] = 5;
			}

			// 🔴 DELETE LOGIC
			// Block delete if ANY accepted or completed volunteer exists
			task.hasActiveVolunteer = statusList.some(
				(s) => s.status === 'accepted' || s.status === 'completed'
			);

			// 🟢 COMPLETION LOGIC
			// Only consider accepted + completed volunteers
			const acceptedVolunteers = statusList.filter(
				(s) => s.status === 'accepted' || s.status === 'completed'
			);

			task.canMarkComplete =
				acceptedVolunteers.length > 0 && acceptedVolunteers.every((s) => s.status === 'completed');
		}

		ratings = newRatings;
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
			await get_your_tasks(user);
		} catch (e) {
			toast.error('Error deleting task');
		}
	}

	async function mark_completed(taskId: string) {
		try {
			await delete_all_status_for_task(taskId);
			await pb.collection('tasks').delete(taskId);
			toast.success(`Task Completed`);
			await get_your_tasks(user);
			window.location.reload();
		} catch (e) {
			toast.error('Error completing task');
		}
	}

	async function submitKarma(record: any) {
		try {
			for (let status of record.status_list) {
				if (status.status !== 'completed') continue;

				const userId = status.expand.user.id;
				const karmaToAdd = ratings[status.id];

				const volunteer = await pb.collection('users').getOne(userId);

				await pb.collection('users').update(userId, {
					karma: volunteer.karma + karmaToAdd
				});
			}

			toast.success('Ratings submitted successfully!');
			await mark_completed(record.id);
		} catch (err) {
			console.error(err);
			toast.error('Failed to submit karma');
		}
	}

	async function update_status(status_id: string, new_status: 'accepted' | 'rejected') {
		try {
			await pb.collection('status').update(status_id, {
				status: new_status
			});

			toast.success(`Volunteer ${new_status}`);
			await get_your_tasks(user);
		} catch (err) {
			console.error(err);
			toast.error('Unable to update status');
		}
	}
</script>

<div class="pt-8 pr-3 pl-3 font-mono">
	<h1 class="title-font mt-4 ml-2 text-4xl"><b>Your Tasks.</b></h1>
	<SideMenu />

	{#if !records || records.length === 0}
		<div class="mt-8 flex items-center justify-center text-muted-foreground">
			<p>No active tasks uploaded by you...</p>
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
						<Item.Description>View Volunteers</Item.Description>
					</Item.Content>

					<div class="flex w-full gap-2">
						<Item.Actions>
							<Collapsible.Trigger>
								<Button size="icon" variant="outline" class="rounded-full">
									<Arrow />
								</Button>
							</Collapsible.Trigger>
						</Item.Actions>

						<!-- Show Delete Task only if no volunteers OR none accepted -->
						{#if !record.hasActiveVolunteer}
							<Button variant="destructive" onclick={() => delete_task(record.id)}>
								Delete Task
							</Button>
						{:else}
							<!-- Show Mark as Complete only if all are accepted -->
							<Dialog.Root>
								<Button disabled={!record.canMarkComplete}>
									<Dialog.Trigger>Mark as Complete</Dialog.Trigger></Button
								>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Rate Volunteers</Dialog.Title>
										<Dialog.Description>Give karma (1–10) to each volunteer.</Dialog.Description>
									</Dialog.Header>
									{#each record.status_list as status}
										<div class="flex w-full gap-2 rounded-xl border p-4">
											<div class="mb-2 flex-1 text-lg font-semibold">
												{status.expand.user.username}
											</div>
											<KarmaCounter bind:value={ratings[status.id]} />
										</div>
									{/each}

									<Dialog.Footer class="mt-4">
										<Dialog.Root>
											<Dialog.Trigger>
												<Button>Submit Ratings</Button>
											</Dialog.Trigger>
											<Dialog.Content>
												<Dialog.Header>
													<Dialog.Title>Make the Day More Memorable?</Dialog.Title>
													<Dialog.Description>
														This is completely optional but we would appreciate if you shared a
														selfie of you and the others to remember this day. Kindly attach the
														selfie with the instagram usernames of the the people so that they can
														be tagged.
													</Dialog.Description>
												</Dialog.Header>
												<div class="grid gap-4 py-4">
													<div class="items-center gap-4">
														<a href="https://ig.me/m/helplink.dev" class="w-full">
															<Button class="w-full bg-background text-black">Message Us!</Button>
														</a>
													</div>
												</div>
												<Dialog.Footer>
													<Button
														type="submit"
														onclick={() => {
															submitKarma(record);
														}}>Thank you!</Button
													>
												</Dialog.Footer>
											</Dialog.Content>
										</Dialog.Root>
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
									<!-- Left section -->
									<div class="flex-row">
										<div class="absolute">
											<a href={'/profile/' + status.expand.user.username}
												>{status.expand.user.username}</a
											>
											– {status.status}
										</div>
										<br />
										<span class="text-sm text-muted-foreground">Offer: {status.offer}</span>
									</div>

									<!-- Right section -->
									{#if status.status === 'pending'}
										<div class="flex justify-end gap-2">
											<Button
												variant="secondary"
												size="icon"
												class="size-8"
												onclick={() => update_status(status.id, 'accepted')}
											>
												<Check color="#00ff6e" />
											</Button>

											<Button
												variant="secondary"
												size="icon"
												class="size-8"
												onclick={() => update_status(status.id, 'rejected')}
											>
												<X color="red" />
											</Button>
										</div>
									{/if}
								</div>
							</Item.Root>
						{/each}
					</div>
				</Collapsible.Content>
				<span></span>
			</Collapsible.Root>
		</div>
	{/each}
</div>
