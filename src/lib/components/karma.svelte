<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  let { value = $bindable(7) } = $props();

  function increment() {
    if (value < 10) value++;
  }

  function decrement() {
    if (value > 0) value--;
  }
</script>

<div class="flex items-center">
  <!-- Minus -->
  <Button variant="ghost" size="icon" onclick={decrement}>
    <Minus color="red"/>
  </Button>

  <!-- Value Box -->
  <div class="w-12 h-9 flex items-center justify-center 
              border text-lg font-semibold">
    {value}
  </div>

  <!-- Plus -->
  <Button variant="ghost" size="icon" onclick={increment}>
    <Plus color="#00ff6e" />
  </Button>
</div>
