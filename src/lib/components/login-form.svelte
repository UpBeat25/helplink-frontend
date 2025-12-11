<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import { pb } from "$lib/pocketbase";
	import { toast } from "svelte-sonner";
	import { Spinner } from "$lib/components/ui/spinner/index.js";

	let email = $state("");
	let password = $state("");
	let status = $state("");
	let processing = $state(false);

	async function login() {
		try {
			processing = true;
			status = "";

			await pb.collection("users").authWithPassword(email.toLowerCase(), password);
			document.cookie = pb.authStore.exportToCookie();
			toast.success("Logged in successfully!");
			const params = new URLSearchParams(window.location.search);
			const redirectTo = params.get("redirectTo") || "/home";
			window.location.href = redirectTo;
		} catch (err: any) {
			status = err?.message || "Login failed. Check your credentials.";
			toast.error(status);
		} finally {
			processing = false;
		}
	}
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Login</Card.Title>
		<Card.Description>Use your email to log in to your account</Card.Description>
	</Card.Header>

	<Card.Content>
		<form on:submit|preventDefault={login}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="m@example.com"
						required
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="password">Password</Field.Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						required
					/>
				</Field.Field>

				<Field.Field>
					{#if processing}
						<Button disabled class="w-full">
							<Spinner class="mr-2" />
							Logging in...
						</Button>
					{:else}
						<Button type="submit" class="w-full">Login</Button>
					{/if}

					<Field.Description class="text-center mt-3">
						Don’t have an account? <a href="/signup">Sign up!</a><br>
						Are you a NGO? <a href="mailto:helplink2048@gmail.com">Contact Us!</a>
					</Field.Description>
				</Field.Field>
			</Field.Group>
		</form>

		{#if status}
			<p class="text-sm text-red-500 mt-2 text-center">{status}</p>
		{/if}
	</Card.Content>
</Card.Root>