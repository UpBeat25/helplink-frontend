<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card/index.js';
	import { pb } from '$lib/pocketbase';
	import { onMount } from 'svelte';
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
			<Card class="items-home p-2 shadow-lg">
				<CardHeader class="mt-3">
					<CardDescription class="text-black">
						{ngo.username}
					</CardDescription>
				</CardHeader>
			</Card>
		{/each}
	</div>
</div>
