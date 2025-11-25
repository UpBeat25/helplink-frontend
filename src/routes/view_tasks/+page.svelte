<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Arrow from "@lucide/svelte/icons/arrow-down";
  import Menu from "@lucide/svelte/icons/menu";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { pb } from "$lib/pocketbase";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";

  let { records } = $props();

  const user = pb.authStore.record;
  if (!user) {
    toast.error("You must be logged in");
    goto("/login");
  } 

  async function logout() {
    pb.authStore.clear();
    await goto("/login");
  }

  async function get_tasks() {
    if (!user) return toast.error("You must be logged in");

    records = await pb.collection("status").getFullList({
      filter: `user="${user.id}"`,
      sort: "-created",
      expand: "task,task.uploaded_by"
    });
  }
  get_tasks();

  async function remove_help(status_id: string) {
    if (!user) {
      toast.error("You must be logged in");
      goto("/login");
      return;
    }
    try {
      
      // 1. Delete status record
      await pb.collection("status").delete(status_id);

      toast.success("Success!")
      // 5. Refresh
      records = records.filter((r: any) => r.id !== status_id);

    } catch (e: any) {
      toast.error("Failed to cancel offer: " + e.message);
      console.error(e);
    }
  }
</script>

<div class="pr-3 pt-8 pl-3 font-mono">
  <h1 class="text-3xl mb-4"><b>View Tasks</b></h1>
  <Separator />
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

  {#each records as record}
    {@const task = record.expand.task}
    {@const owner = task?.expand?.uploaded_by}
    <div class="flex w-full flex-col gap-2 px-4">
      <Collapsible.Root class="w-full max-w-sm mx-auto space-y-2">
        <Item.Root variant="outline">
          <Item.Media>
            <Avatar.Root class="size-10">
              <a href={"/profile/" + owner?.username}><Avatar.Fallback>{owner?.username?.[0]?.toUpperCase()}</Avatar.Fallback></a>
            </Avatar.Root>
          </Item.Media>

          <Item.Content>
            <Item.Title>{task?.title}</Item.Title>
            <Item.Description>Status: {record.status}</Item.Description>
          </Item.Content>

          <Item.Actions>
            <Collapsible.Trigger>
              <Button size="icon" variant="outline" class="rounded-full">
                <Arrow />
              </Button>
            </Collapsible.Trigger>
          </Item.Actions>
        </Item.Root>

        <Collapsible.Content class="space-y-2 rounded-md border px-4 py-3 font-mono w-full">
          <Label>Description:</Label>
          <div class="text-sm text-muted-foreground">
            {task?.description}
          </div>
          
          <Label class="text-sm">Your Offer:</Label>
          <div class="text-sm text-muted-foreground">
            {record.offer}
          </div>
          {#if record.status === "accepted"}
            <Label>Private Note:</Label>
            <div class="text-sm text-muted-foreground">
              {task?.private_note}
            </div>
            {#if task.share_loc}
              <Button class="w-full" href="https://www.google.com/maps?q={task.lat},{task.lng}">
                Location
              </Button>
            {/if}
          {/if}
          <Label>Posted by: {owner?.username}</Label>

          {#if record.status !== "accepted"}
            <Dialog.Root>
              <Dialog.Trigger class="w-full">
                <Button class="w-full" variant="destructive">
                    Remove Help
                  </Button>
                </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
                  <Dialog.Description>
                    This action cannot be undone.
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Footer>
                  <Dialog.Close>
                    <Button class="w-full" variant="destructive" type="submit" onclick={() => remove_help(record.id)}>
                      Yes, Confirm
                    </Button>
                  </Dialog.Close>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>
          {/if}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  {/each}
</div>