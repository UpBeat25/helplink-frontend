<script>
    import Menu from "@lucide/svelte/icons/menu";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { pb } from "$lib/pocketbase";
    import { goto } from "$app/navigation";

    const user = pb.authStore.record;

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
        <Button variant="outline" type="button" onclick={() => {goto("/view_tasks")}}>Your Offers</Button>
        <Button variant="outline" type="button" onclick={() => {goto("/your_tasks")}}>Your Tasks</Button>
      </Sheet.Header>
      <Sheet.Footer>
        <Button variant="outline" type="button" onclick={() => {goto(`/profile/${user?.username}`)}}>Your Profile</Button>
        <Button variant="ghost" type="button" onclick={logout}><span style="color: red">Logout</span></Button>
      </Sheet.Footer>
    </Sheet.Content>
  </Sheet.Root>