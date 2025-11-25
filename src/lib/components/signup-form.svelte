<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import { pb } from "$lib/pocketbase"; // make sure $lib/pocketbase.ts exports your PocketBase instance
	import { toast } from "svelte-sonner";
	import Calendar from "$lib/components/ui/calendar/calendar.svelte";
	import * as Popover from "$lib/components/ui/popover";
	import { Spinner } from "$lib/components/ui/spinner/index.js";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { getLocalTimeZone, today, type CalendarDate } from "@internationalized/date";

	// ✅ Svelte 5: declare reactive state variables properly
	let open = $state(false);
	let processing = $state(true)
	let value = $state<CalendarDate | undefined>();

	let name = $state("");
	let username = $state("");
	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let status = $state("");
	let dob = $state("");

	async function register() {
		try {
			processing = false;
			if (password !== confirmPassword) {
				status = "Passwords do not match.";
				return;
			}

			const formData = new FormData();
			formData.append("name", name);
			formData.append("username", username);
			formData.append("email", email);
			formData.append("dob", dob);
			formData.append("password", password);
			formData.append("passwordConfirm", confirmPassword);

			await pb.collection("users").create(formData);
			await pb.collection("users").authWithPassword(email, password);
			document.cookie = pb.authStore.exportToCookie();
			toast.success("Account created successfully!");
			const redirectTo = "/home";
			window.location.href = redirectTo;
		} catch (err: any) {
			status = err?.message + " Try choosing a different username" || "Signup failed.";
			toast.error(status);
			processing = true;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Create an account</Card.Title>
		<Card.Description>Enter your information below to create your account</Card.Description>
	</Card.Header>

	<Card.Content>
		<form onsubmit={register}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="name">Full Name</Field.Label>
					<Input id="name" bind:value={name} placeholder="John Doe" required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="username">Username</Field.Label>
					<Input id="username" bind:value={username} placeholder="Choose a username..." required />
				</Field.Field>

				<Field.Field>
					<Field.Label for="dob">Date of Birth</Field.Label>
					<Popover.Root bind:open>
						<Popover.Trigger>
							<Button variant="outline" class="font-normal w-full">
								{value
									? value.toDate(getLocalTimeZone()).toLocaleDateString()
									: "Select date"}
								<ChevronDownIcon />
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-auto overflow-hidden p-0" align="start">
							<Calendar
								type="single"
								bind:value
								captionLayout="dropdown"
								onValueChange={() => {
									dob = value?.toDate(getLocalTimeZone()).toISOString() ?? "";
									open = false;
								}}
								maxValue={today(getLocalTimeZone())}
							/>
						</Popover.Content>
					</Popover.Root>
				</Field.Field>

				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" type="email" bind:value={email} placeholder="m@example.com" required />
					<Field.Description>
						We'll use this to contact you. We will not share your email with anyone else.
					</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="password">Password</Field.Label>
					<Input id="password" type="password" bind:value={password} required />
					<Field.Description>Must be at least 8 characters long.</Field.Description>
				</Field.Field>

				<Field.Field>
					<Field.Label for="confirm-password">Confirm Password</Field.Label>
					<Input id="confirm-password" type="password" bind:value={confirmPassword} required />
					<Field.Description>Please confirm your password.</Field.Description>
				</Field.Field>

				<Field.Group>
					<Field.Field>
						{#if processing === true}
							<Button type="submit">Create Account</Button>
						{:else}
							<Button disabled type="submit">
								<Spinner />
								Create Account
							</Button>
						{/if}
						<Field.Description class="px-6 text-center">
							Already have an account? <a href="/login">Log in</a>
						</Field.Description>
					</Field.Field>
				</Field.Group>
			</Field.Group>
		</form>

		{#if status}
			<p class="text-sm text-red-500 mt-2 text-center">{status}</p>
		{/if}
	</Card.Content>
</Card.Root>