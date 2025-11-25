<script>
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } 
    from "$lib/components/ui/card/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  export const prerender = false;
</script>

<div class="min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-md space-y-8">

    <!-- Header -->
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">HelpLink.</h1>
      <p class="text-sm text-muted-foreground">
        Add this website to your home screen for a seamless, app-like experience.
      </p>
    </div>

    <!-- Card -->
    <Card class="rounded-2xl">
      <CardHeader>
        <CardTitle class="text-lg font-semibold">How to Install</CardTitle>
        <CardDescription>
          Follow these simple steps on your phone's browser.
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent class="pt-6 space-y-4">
        <ol class="space-y-3 text-sm">

          <li class="flex gap-3">
            <span class="font-medium text-foreground">1.</span>
            <span>Tap your browser’s menu (<strong>⋮</strong>) in the top-right corner.</span>
          </li>

          <li class="flex gap-3">
            <span class="font-medium text-foreground">2.</span>
            <span>Select <strong>Add to Home screen</strong>.</span>
          </li>

          <li class="flex gap-3">
            <span class="font-medium text-foreground">3.</span>
            <span>Press <strong>Install</strong> when prompted.</span>
          </li>

        </ol>
      </CardContent>
    </Card>

    <p class="text-xs text-center text-muted-foreground">
      Once installed, the app will appear on your home screen.
    </p>
  </div>
</div>
