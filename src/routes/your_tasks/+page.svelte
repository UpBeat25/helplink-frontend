<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import { Button } from "$lib/components/ui/button/index.js";
  import Arrow from "@lucide/svelte/icons/arrow-down";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import KarmaCounter from "$lib/components/karma.svelte";
  import { Label } from "$lib/components/ui/label/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { pb } from "$lib/pocketbase";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import SideMenu from "$lib/components/menu.svelte";

  let ratings = $state<any>({});

  let { records } = $props();

  const user = pb.authStore.record;

  onMount(async () => {
    const user = pb.authStore.record;
    
    if (!user) {
      toast.error("You must be logged in");
      goto("/login"); // ✅ safe: only runs on client
      return;
    }

    await get_your_tasks(user);
  });

  async function get_your_tasks(user: any) {
    if (!user) return;

    const tasks = await pb.collection("tasks").getFullList({
      filter: `uploaded_by="${user.id}"`,
      sort: "-created"
    });

    const newRatings: any = {}; // Build new ratings object

    for (let task of tasks) {
      const statusList = await pb.collection("status").getFullList({
        filter: `task="${task.id}"`,
        expand: "user"
      });

      task.status_list = statusList;

      for (let status of statusList) {
        newRatings[status.id] = 5; // Default rating of 5
      }

      // NEW — all volunteers must be accepted
      task.allAccepted = statusList.length > 0 && statusList.every(s => s.status === "accepted");

      // NEW — all volunteers must be completed
      task.allCompleted = statusList.length > 0 && statusList.every(s => s.status === "completed");
    }

    ratings = newRatings; // Reassign for reactivity
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

  async function delete_task(taskId: string) {
    try {
      await delete_all_status_for_task(taskId);
      await pb.collection("tasks").delete(taskId);
      toast.success(`Task Deleted`);
      get_your_tasks(user); // refresh
    } catch (e) {
      toast.error("Error deleting task");
    }
  }
  
  async function mark_completed(taskId: string) {
    try {
      await delete_all_status_for_task(taskId);
      await pb.collection("tasks").delete(taskId);
      toast.success(`Task Completed`);
      get_your_tasks(user); // refresh
    } catch (e) {
      toast.error("Error deleting task");
    }
  }

  async function submitKarma(record: any) {
    try {
      for (let status of record.status_list) {
        const userId = status.expand.user.id;
        const karmaToAdd = ratings[status.id];

        // Fetch current user to get their existing karma
        const volunteer = await pb.collection("users").getOne(userId);

        // Increment the user's karma
        await pb.collection("users").update(userId, {
          karma: volunteer.karma + karmaToAdd
        });
      }

      toast.success("Ratings submitted successfully!");
      await mark_completed(record.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit karma");
    }
  }


  async function update_status(status_id: string, new_status: "accepted" | "rejected") {
    try {
      await pb.collection("status").update(status_id, {
        status: new_status
      });

      toast.success(`Volunteer ${new_status}`);
      // Refresh UI
      await get_your_tasks(user);
    } catch (err) {
      console.error(err);
      toast.error("Unable to update status");
    }
  }

</script>

<div class="pr-3 pt-8 pl-3 font-mono">
  <h1 class="text-3xl mb-4"><b>Your Tasks</b></h1>
  <Separator />
  <SideMenu />

  {#if !records || records.length === 0}
    <div class="flex items-center justify-center mt-8 text-muted-foreground">
      <p>No active tasks uploaded by you...</p>
    </div>
  {/if}

  {#each records as record}
    <div class="flex w-full flex-col gap-2 px-4">
      <Collapsible.Root class="w-full max-w-sm mx-auto space-y-2">
        <Item.Root variant="outline">

          <Item.Content>
            <Item.Title>{record.title}</Item.Title>
            <Item.Description>View Volunteers</Item.Description>
          </Item.Content>

          <!-- Show Delete Task only if no volunteers OR none accepted -->
          {#if !record.allAccepted && !record.allCompleted}
            <Button variant="destructive" onclick={() => delete_task(record.id)}>
              Delete Task
            </Button>
          {:else}
            <!-- Show Mark as Complete only if all are accepted -->
            <Dialog.Root>
              <Dialog.Trigger><Button disabled={!record.allCompleted}>
                Mark as Complete
              </Button></Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Rate Volunteers</Dialog.Title>
                  <Dialog.Description>
                    Give karma (1–10) to each volunteer.
                  </Dialog.Description>
                </Dialog.Header>
                {#each record.status_list as status}
                  <div class="border rounded-xl p-4">
                    <div class="font-semibold text-lg mb-2">
                      {status.expand.user.username}
                    </div>
                    <KarmaCounter bind:value={ratings[status.id]} />
                  </div>
                {/each}
  
                <Dialog.Footer class="mt-4">
                    <Dialog.Root>
                      <Dialog.Trigger>
                        <Button>
                          Submit Ratings
                        </Button>
                      </Dialog.Trigger>
                      <Dialog.Content class="sm:max-w-[425px]">
                        <Dialog.Header>
                          <Dialog.Title>Make the Day More Memorable?</Dialog.Title>
                          <Dialog.Description>
                            This is completely optional but we would appreciate if you shared a selfie of you and the others to remember this day. Kindly attach the selfie with the instagram usernames of the the people so that they can be tagged.
                          </Dialog.Description>
                        </Dialog.Header>
                        <div class="grid gap-4 py-4">
                          <div class="grid grid-cols-4 items-center gap-4">
                            <a href="https://instagram.com/helplink.dev" class="w-full">
                              <Button>Email</Button>
                            </a>
                          </div>
                        </div>
                        <Dialog.Footer>
                          <Button type="submit" onclick={() => {submitKarma(record)}}>Thank you!</Button>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Root>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>

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
                  {#if status.status === "pending"}
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
