<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Menu from "@lucide/svelte/icons/menu";
  import { goto } from "$app/navigation";
  import { pb } from "$lib/pocketbase";
  
  export let data;
  const { user } = data;

    async function logout() {
        pb.authStore.clear();
        await goto("/login");
    }

</script>
  <Sheet.Root>
    <Sheet.Trigger>
      <Button size="icon" variant="outline" class="rounded-full absolute top-7 right-4" aria-label="menu">
        <Menu />
      </Button>
    </Sheet.Trigger>
    <Sheet.Content>
      <Sheet.Header>
        <Sheet.Title>MENU</Sheet.Title>
        <Sheet.Description>
          Navigate through the app using the options below.
        </Sheet.Description>
        <Button variant="outline" type="button" onclick={() => {goto("/home")}}>Home</Button>
        <Button variant="outline" type="button" onclick={() => {goto("/upload")}}>New Request</Button>
        <Button variant="outline" type="button" onclick={() => {goto("/view_tasks")}}>View Tasks</Button>
        <Button variant="outline" type="button" onclick={() => {goto("/your_tasks")}}>Your Tasks</Button>
      </Sheet.Header>
      <Sheet.Footer>
        <Button variant="outline" type="button" class="color-red" onclick={logout}>Logout</Button>
      </Sheet.Footer>
    </Sheet.Content>
  </Sheet.Root>
<div class="min-h-screen flex items-center justify-center">
    <div class="mx-auto max-w-2xl p-6 space-y-8 font-mono">
        <!-- Profile Header -->
        <Card.Root class="p-6 space-y-1">
            <div class="items-center">
                <Avatar class="w-30 h-30 mb-4">
                    <AvatarFallback class="text-4xl font-bold">{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <h1 class="text-xl font-bold">{user.name}</h1>
                <p class="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <div>
                <Label>Date of Birth</Label>
                <p class="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }).format(new Date(user.dob))}
                </p>
            </div>
            <Separator />
            <div class="flex gap-3">
                <Badge>Karma: {user.karma}</Badge>
                <Badge variant="secondary">Joined {new Date(user.created).toDateString()}</Badge>
            </div>
        </Card.Root>
    </div>
</div>