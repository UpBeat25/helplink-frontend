<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	type User = {
		id: string;
		username: string;
		name: string;
		email: string;
		is_ngo: boolean;
	};

	let ngos = $state<User[]>([]);

	async function loadNGOs() {
		try {
			ngos = await pb.collection('users').getFullList({
				filter: 'is_ngo = true'
			});
		} catch (err) {
			console.error(err);
		}
	}

	onMount(() => {
		loadNGOs();
	});

	
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

<div class="back min-h-screen items-center justify-center bg-background p-6 font-mono">
	<div class="space-y-2 text-center">
		<h1 class="text-5xl font-bold tracking-tight">Our Partners</h1>
		<p class="text-sm">
			We express our heartfelt gratitude to all the organizations that have partnered with us to
			support the mission of making a more inclusive community and to honour their contributions, we
			have created a seperate page to show their journey with us!
		</p>
	</div>
	<div class="grid grid-cols-3 gap-4">
		{#each ngos as ngo}
			<Card class="items-home p-2 shadow-lg" onclick={() => navigate(`/profile/${ngo.username}`)}>
				<CardHeader class="mt-3">
					<CardDescription class="text-black">
						{ngo.username}
					</CardDescription>
				</CardHeader>
			</Card>
		{/each}
	</div>
</div>