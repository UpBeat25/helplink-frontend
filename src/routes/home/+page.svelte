<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import Arrow from "@lucide/svelte/icons/arrow-down";
  import Funnel from "@lucide/svelte/icons/funnel";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import SideMenu from "$lib/components/menu.svelte";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { Slider } from "$lib/components/ui/slider/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { pb } from "$lib/pocketbase";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  // Changed from props to local state
  let records = $state<any[]>([]);
  let volunteeredTaskIds = $state<Set<string>>(new Set());
  
  let value = $state(250);
  let selected = $state("offline");
  let offer_texts = $state<Record<string, string>>({});
  let processing = $state(false);
  let latitude = $state(0);
  let longitude = $state(0);
  let error: string | null = $state(null);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const user = pb.authStore.record;

  async function logout() {
    pb.authStore.clear();
    await goto("/login");
  }

  function getBoundingBox(lat: number, lng: number, radiusInMeters: number) {
    const R = 6371;
    const radiusInKm = radiusInMeters / 1000;
    const latDelta = radiusInKm / R * (180 / Math.PI);
    const lngDelta = radiusInKm / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta
    };
  }

  function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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

  async function applyFilter() {
    if (!user) {
      toast.error("You must be logged in");
      goto("/login")
      return;
    }
    
    try {
      const volunteeredStatus = await pb.collection("status").getFullList({
        filter: `user = "${user.id}" && status != "rejected"`,
      });

      volunteeredTaskIds = new Set(volunteeredStatus.map(rec => 
        typeof rec.task === 'object' ? rec.task.id : rec.task
      ));
      
      if (browser) {
        localStorage.setItem("filterDistance", String(value));
        localStorage.setItem("filterOnlineOnly", selected);
      }

      const box = getBoundingBox(latitude, longitude, value);
      const filter = selected === "online"
        ? `online_only = true`
        : `(online_only = false && uploaded_by != "${user.id}" && lat >= ${box.minLat} && lat <= ${box.maxLat} && lng >= ${box.minLng} && lng <= ${box.maxLng})`;

      records = await pb.collection("tasks").getFullList({
        sort: "-created",
        filter: filter,
        expand: "uploaded_by"
      });
    } catch (err: any) {
      console.error("Error applying filter:", err);
      toast.error("Failed to load tasks");
    }
  }

  onMount(() => {
    // Load saved values from localStorage
    if (browser) {
      const savedDistance = localStorage.getItem("filterDistance");
      const savedOnlineOnly = localStorage.getItem("filterOnlineOnly");
      
      if (savedDistance) {
        value = Number(savedDistance);
      }
      if (savedOnlineOnly) {
        selected = savedOnlineOnly;
      }
    }

    // Get location and apply filter
    getLocation()
      .then(() => applyFilter())
      .catch(err => {
        console.error("Location error:", err);
        toast.error("Could not get location. Please enable location access.");
      });
  });

  // Watch for changes to value and selected to trigger filter updates with debouncing
  $effect(() => {
    if (browser && latitude !== 0 && longitude !== 0) {
      value;
      selected;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        applyFilter();
      }, 300);
    }
  });

  async function help_user(id: string, offer: string) {
    if (!user) {
      toast.error("You must be logged in");
      goto("/login");
      return;
    }
    
    processing = true;
    
    try {
      const existing = await pb.collection("status").getFullList({
        filter: `task="${id}" && user="${user.id}"`
      });

      if (existing.length > 0) {
        toast.error("You've already offered to help.");
        processing = false;
        return false;
      }

      await pb.collection("status").create({
        user: user.id,
        task: id,
        offer: offer,
        status: "pending"
      });

      toast.success("Help offer sent successfully!");
      
      // Refresh the task list instead of full page reload
      await applyFilter();
      processing = false;
      return true;

    } catch (e: any) {
      console.error("Error creating status:", e);
      toast.error("Error: " + (e.data?.message || e.message));
      processing = false;
      return false;
    }
  }
</script>

<div class="pr-3 pt-8 pl-3 font-mono">
  <h1 class="text-3xl mb-4"><b>HelpLink.</b></h1>
  <Separator></Separator>
  
  <SideMenu />

  <Drawer.Root>
    <Drawer.Trigger>
      <Button size="icon" variant="outline" class="rounded-full absolute top-7 right-16" aria-label="filter">
        <Funnel/>
      </Button>
    </Drawer.Trigger>
    <Drawer.Content>
      <div class="mx-auto w-full max-w-sm">
        <Drawer.Header>
          <Drawer.Title class='flex items-center justify-center space-x-2 text-4xl font-bold tracking-tighter'>Add Filter</Drawer.Title>
          <br>
        </Drawer.Header>

        {#if selected === 'offline'}
        <div class="p-4 pb-0">
          <div class="flex items-center justify-center space-x-2">
            <div class="text-7xl font-bold tracking-tighter">
              {value} m
            </div>
          </div>
          <br>
          <div class="flex items-center justify-center space-x-2">
            <span>0</span><Slider type="single" bind:value max={3000} step={10} /><span>3km</span>
          </div>
        </div>
        {/if}
        
        <Drawer.Footer>
          <Drawer.Close>
            <Button class="w-80">Submit</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </div>
    </Drawer.Content>
  </Drawer.Root>

  {#if records.length === 0 && latitude !== 0}
    <div class="flex items-center justify-center mt-8 text-muted-foreground">
      <p>No tasks found in your area...</p>
    </div>
  {/if}

  {#each records as record}
    {#if !volunteeredTaskIds.has(record.id)}
      {@const user_r = record.expand?.uploaded_by}
      <div class="flex w-full flex-col gap-2 px-4 mt-4">
        <Collapsible.Root class="w-full max-w-sm mx-auto space-y-2">
          <Item.Root variant="outline">
            <Item.Media>
              <Avatar.Root class="size-10">
                <Avatar.Fallback>{user_r?.username?.[0]?.toUpperCase() || 'U'}</Avatar.Fallback>
              </Avatar.Root>
            </Item.Media>
            <Item.Content>
              <Item.Title>{record.title}</Item.Title>
              <Item.Description>{distance(latitude, longitude, record.lat, record.lng).toFixed(2)} meters away</Item.Description>
            </Item.Content>
            <Item.Actions>
              <Collapsible.Trigger>
                <Button size="icon" variant="outline" class="rounded-full" aria-label="expand">
                  <Arrow />
                </Button>
              </Collapsible.Trigger>
            </Item.Actions>
          </Item.Root>
          <Collapsible.Content class="space-y-2 rounded-md border px-4 py-3 font-mono">
            <Label>Description:</Label>
            <div class="text-sm text-muted-foreground">
              {record.description}
            </div>
            <Label>{user_r?.username || 'Unknown User'}</Label>
            <Input bind:value={offer_texts[record.id]} placeholder="Your Offer Here..." />
            {#if !offer_texts[record.id]}
              <Button type="submit" class="w-full" disabled>Help</Button>
            {:else if processing}
              <Button disabled class="w-full">
                <Spinner class="mr-2" />
                Uploading...
              </Button>
            {:else}
              <Button class="w-full" onclick={() => help_user(record.id, offer_texts[record.id])}>Help</Button>
            {/if}
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    {/if}
  {/each}
</div>