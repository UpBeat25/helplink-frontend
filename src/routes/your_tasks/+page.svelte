<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import { Button } from "$lib/components/ui/button/index.js";
  import Arrow from "@lucide/svelte/icons/arrow-down";
  import Menu from "@lucide/svelte/icons/menu";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { pb } from "$lib/pocketbase";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";

  let { records } = $props();

  const user = pb.authStore.record;
  if (!user) {
    toast.error("You must be logged in");
    goto('/login');
  } 

  async function logout() {
    pb.authStore.clear();
    await goto("/login");
  }

  async function get_your_tasks() {
    if (!user) {
      toast.error("You must be logged in");
      goto("/login");
      return;
    }
    const tasks = await pb.collection("tasks").getFullList({
      filter: `uploaded_by="${user.id}"`,
      sort: "-created"
    });

    for (let task of tasks) {
      const statusList = await pb.collection("status").getFullList({
        filter: `task="${task.id}"`,
        expand: "user"
      });
      task.status_list = statusList;
      task.hasAccepted = statusList.some(s => s.status === "accepted");
    }

    records = tasks;
  }

  async function delete_all_status_for_task(taskId: string) {
    const statuses = await pb.collection("status").getFullList({
      filter: `task="${taskId}"`
    });

    for (let s of statuses) {
      await pb.collection("status").delete(s.id);
    }
  }

  async function delete_task(taskId: string, status: string) {
    try {
      await delete_all_status_for_task(taskId);
      await pb.collection("tasks").delete(taskId);
      toast.success(`Task ${status}`);
      get_your_tasks(); // refresh
    } catch (e) {
      toast.error("Error deleting task");
    }
  }

  async function update_status(status_id: string, new_status: "accepted" | "rejected") {
    try {
      await pb.collection("status").update(status_id, {
        status: new_status
      });

      toast.success(`Volunteer ${new_status}`);
      // Refresh UI
      location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Unable to update status");
    }
  }
  get_your_tasks();

</script>

<div class="pr-3 pt-8 pl-3 font-mono">
  <h1 class="text-3xl mb-4"><b>Your Tasks</b></h1>
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
    <div class="flex w-full flex-col gap-2 px-4">
      <Collapsible.Root class="w-full max-w-sm mx-auto space-y-2">
        <Item.Root variant="outline">

          <Item.Content>
            <Item.Title>{record.title}</Item.Title>
            <Item.Description>View Volunteers</Item.Description>
          </Item.Content>

          {#if !record.hasAccepted}
            <div class="flex justify-end">
              <Button
                variant="destructive"
                onclick={() => delete_task(record.id, "deleted")}
              >
                Delete Task
              </Button>
            </div>
          {:else}
            <div class="flex justify-end">
              <Button onclick={() => delete_task(record.id, "completed")}>
                Completed
              </Button>
            </div>
          {/if}
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
            {record.description}
          </div>
          
          <Label class="text-sm">Volunteers:</Label>
          <div class="text-sm">
            {#each record.status_list as status}
              <Item.Root variant="outline" class="p-3 rounded-xl">
                <div class="grid grid-cols-2 items-center w-full">
                  
                  <!-- Left section -->
                  <div class="flex-row">
                    <div class="absolute"><a href={"/profile/" + status.expand.user.username}>{status.expand.user.username}</a> – {status.status}</div>
                    <br>
                    <span class="text-muted-foreground text-sm">Offer: {status.offer}</span>
                  </div>

                  <!-- Right section -->
                  {#if status.status != "accepted" && status.status != "rejected"}
                    <div class="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        class="size-8"
                        onclick={() => update_status(status.id, "accepted")}
                      >
                        <Check color="#00ff6e" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="icon"
                        class="size-8"
                        onclick={() => update_status(status.id, "rejected")}
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
      </Collapsible.Root>
    </div>
  {/each}
</div>