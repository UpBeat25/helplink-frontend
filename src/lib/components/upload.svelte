<script lang="ts">
	const { id = "1"} = $props();
	import { onMount, tick } from "svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import {
		FieldGroup,
		Field,
		FieldLabel,
	} from "$lib/components/ui/field/index.js";
	import { goto } from "$app/navigation";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import { toast } from "svelte-sonner";
	import { pb } from "$lib/pocketbase"
	import { Spinner } from "$lib/components/ui/spinner/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import "leaflet/dist/leaflet.css";

	// Form Details
	let title = $state("");
	let description = $state("");
	let private_n = $state("");
	let share_loc = $state(true);

	let selected = $state("offline");
	let L: any = $state(null);
	let map: any;
	let marker: any;
	let mapInitialized = false;
	let mapContainer: HTMLElement | null = $state(null);

	let latitude: number | null = $state(0);
	let longitude: number | null = $state(0);
	let error: string | null = $state(null);

	// Extras
	let processing = $state(false);

	// ✅ Get user location
	function getLocation(): Promise<{ lat: number; lng: number }> {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				error = "Geolocation not supported by your browser.";
				reject(error);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					latitude = pos.coords.latitude;
					longitude = pos.coords.longitude;
					error = null;
					resolve({ lat: latitude, lng: longitude });
				},
				(err) => {
					error = "Unable to retrieve location: " + err.message;
					reject(error);
				},
				{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
			);
		});
	}

	// ✅ Initialize map
	async function initMap() {
		await tick();

		if (!mapContainer) return;
		if (!L) return;

		// only initialize once
		if (!mapInitialized) {
			const pos = latitude && longitude ? { lat: latitude, lng: longitude } : await getLocation();
			map = L.map(mapContainer).setView([pos.lat, pos.lng], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

			marker = L.marker([pos.lat, pos.lng]).addTo(map);

			map.on("click", (e: any) => {
				latitude = e.latlng.lat;
				longitude = e.latlng.lng;
				marker.setLatLng(e.latlng);
			});

			mapInitialized = true;
		}

		// ✅ Fix glitch: ensure correct sizing when becoming visible
		setTimeout(() => {
			map.invalidateSize();
		}, 100);
	}

	const user = pb.authStore.record;

	onMount(async () => {
		if (!user) {
			toast.error("You must be logged in");
			goto("/login");
		}  
		const mod = await import("leaflet");
		L = mod.default ?? mod;

        L.Icon.Default.mergeOptions({
        iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });

		// preload location so map centers quickly
		try {
			await getLocation();
		} catch (e) {
			console.warn(e);
		}

		// Initialize map after L is loaded and if offline mode is selected
		if (selected === "offline") {
			await initMap();
		}
	});

	// Watch for offline toggle
	$effect(() => {
		if (selected === "offline" && L) {
			initMap();
		} else {
			latitude = longitude = 0;
		}
	});

	async function onSubmit(e: Event) {
		processing = true;
		if (!user) {
			toast.error("You must be logged in");
			goto("/login");
			return;
		}
		const formData = new FormData();
		formData.append("title", title);
		formData.append("description", description);
		formData.append("private_note", private_n);
		formData.append("online_only", selected === "online" ? "true" : "false");
		formData.append("lat", String(latitude));
		formData.append("lng", String(longitude));
		formData.append("uploaded_by", user.id);
		formData.append("share_loc", String(share_loc));

		try {
			await pb.collection("tasks").create(formData);
			toast.success("Submitted!");
			goto("/home");
		} catch (error: any) {
			const a = document.getElementById("status");
			if (a) a.innerHTML = error.message || "Error submitting task";
		} finally {
			processing = false;
		}
		
	}
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Ask For a Hand</Card.Title>
		<Card.Description>Please enter the details and nature of the task below</Card.Description>
	</Card.Header>

	<Card.Content>
		<form onsubmit={onSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel for={"title-" + id}>Title</FieldLabel>
					<Input id={"title-" + id} bind:value={title} type="text" placeholder="Title Here..." required />
				</Field>

				<Field>
					<FieldLabel for={"description-" + id}>Description</FieldLabel>
					<Textarea id={"description-" + id} bind:value={description} placeholder="Type your message here." required />
				</Field>

				<Field>
					<FieldLabel for={"private-" + id}>Private Note</FieldLabel>
					<Textarea id={"private-" + id} bind:value={private_n} placeholder="Add contact details..." required />
				</Field>

				<Field>
					<!--
					<FieldLabel for={"type-" + id}>Select Type</FieldLabel>
					<RadioGroup.Root bind:value={selected}>
						<div class="flex items-center justify-center space-x-4">
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="online" id={"online-" + id} />
								<Label for={"online-" + id}>Online</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="offline" id={"offline-" + id} />
								<Label for={"offline-" + id}>Offline</Label>
							</div>
						</div>
					</RadioGroup.Root>-->

					{#if selected === "offline"}
						<FieldLabel>Adjust the location as per your needs...</FieldLabel>
						<div class="p-4 pb-0">
							{#if latitude !== null && longitude !== null}
								<!-- ✅ Bind element reference for map -->
								<div bind:this={mapContainer} class="h-64 w-full rounded-lg border"></div>
								<div class="mt-2 flex space-x-4 text-sm text-muted-foreground">
									<div>Lat: {latitude.toFixed(6)}</div>
									<div>Lng: {longitude.toFixed(6)}</div>
								</div>
							{:else if error}
								<p class="text-red-500 text-sm p-2">{error}</p>
							{:else}
								<p class="text-sm p-2 text-muted-foreground">Getting your location...</p>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<Checkbox id="terms" bind:checked={share_loc}/>
							<Label for="terms">Share location on map with volunteers?</Label>
						</div>
					{/if}
				</Field>

				<Field>
					{#if processing}
						<Button disabled class="w-full">
							<Spinner class="mr-2" />
							Uploading...
						</Button>
					{:else}
						<Button type="submit" class="w-full">Submit</Button>
					{/if}
				</Field>
			</FieldGroup>
		</form>
		<p id="status" class="text-sm text-red-500 mt-2 text-center"></p>
	</Card.Content>
</Card.Root>
