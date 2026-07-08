<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { page } from '$app/stores';
	import { toggleMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { getFirebaseMessaging } from '$lib/firebase';
	import { getToken } from 'firebase/messaging';

	const user = pb.authStore.record;

	async function enableNotifications() {
		if (!user!.device_id) {
			if (!('Notification' in window)) return;

			const permission = await Notification.requestPermission();

			if (permission !== 'granted') {
				toast.error('Notifications were not enabled.');
				return;
			}

			await navigator.serviceWorker.register('/firebase-messaging-sw.js');

			const messaging = await getFirebaseMessaging();
			if (!messaging) return;
			const token = await getToken(messaging, {
				vapidKey:
					'BFzK3iT2LiiS-sIwngwRZrcQkdquoC243Ac1U9WUutoQ6Nl4ez0ow23ab1wkH6sQirzl3HQctNMrot20g42KPnY'
			});

			if (!token) {
				toast.error("Couldn't obtain notification token.");
				return;
			}

			const profile = await pb.collection("profile").getFirstListItem(
				`user="${user!.id}"`
			);

			await pb.collection("profile").update(profile.id, {
				device_id: token
			});

			toast.success('Notifications enabled!');
		}
	}

	let open = false;

	function navigate(path: string) {
		if ($page.url.pathname === path) {
			// Same page → just close menu
			open = false;
		} else {
			// Different page → navigate
			goto(path);
			open = false;
		}
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Trigger>
		<Button
			size="icon"
			variant="outline_bu"
			class="fixed bottom-7 left-1/2 z-[8] w-50 -translate-x-1/2 rounded-full text-black"
			aria-label="menu"
			onclick={() => {enableNotifications()}}
		>
			<Menu />
		</Button>
	</Sheet.Trigger>
	<Sheet.Content>
		<Sheet.Footer>
			<h1 class="menu_font">
				Menu{#if user?.is_ngo}: NGO Account{/if}
			</h1>
			{#if !user?.is_ngo}
				<Button variant="outline_m" size="lg" type="button" onclick={() => navigate('/home')}
					>Home</Button
				>
				<Button
					variant="outline_m"
					size="lg"
					type="button"
					onclick={() => {
						navigate('/upload');
					}}>New Request</Button
				>
				<Button
					variant="outline_m"
					size="lg"
					type="button"
					onclick={() => {
						navigate('/view_tasks');
					}}>Your Offers</Button
				>
				<Button
					variant="outline_m"
					size="lg"
					type="button"
					onclick={() => {
						navigate('/your_tasks');
					}}>Your Tasks</Button
				>
			{:else}
				<Button
					variant="outline_m"
					size="lg"
					type="button"
					onclick={() => {
						navigate('/upload_ngo');
					}}>Create A New Event</Button
				>
				<Button
					variant="outline_m"
					size="lg"
					type="button"
					onclick={() => {
						navigate('/your_events');
					}}>Your Active Events</Button
				>
			{/if}
			<Button
				variant="outline_m"
				size="lg"
				type="button"
				onclick={() => {
					navigate(`/profile/${user?.username}`);
				}}>Your Profile</Button
			>

			<!--
			<Button onclick={toggleMode} variant="outline">
				<SunIcon
					class="h-[3rem] w-[3rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
				/>
				<MoonIcon
					class="absolute h-[3rem] w-[3rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>-->
		</Sheet.Footer>
		<br />
	</Sheet.Content>
</Sheet.Root>
