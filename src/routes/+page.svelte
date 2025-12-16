<script>
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	export const prerender = false;
</script>

<div class="bg-background flex min-h-screen items-center justify-center p-6 font-mono">
	<div class="w-full max-w-md space-y-10">
		<!-- Header -->
		<div class="space-y-2 text-center">
			<h1 class="text-4xl font-bold tracking-tight">HelpLink</h1>
			<p class="text-muted-foreground text-sm">
				Install HelpLink on your device for a fast, app-like experience.
			</p>
		</div>

		<!-- Main Card -->
		<Card class="rounded-3xl p-2 shadow-lg">
			<CardHeader class="mt-3">
				<CardTitle class="text-xl font-semibold">How to Install</CardTitle>
				<CardDescription>Choose your device or platform below.</CardDescription>
			</CardHeader>

			<CardContent class="pb-3 space-y-4">
				<Separator />
				<!-- ANDROID -->
				<div class="space-y-3">
					<h2 class="text-lg font-bold">Android (Chrome)</h2>
					<ol class="space-y-3 text-sm">
						<li class="flex gap-3">
							<span class="font-medium">1.</span><span
								>Tap the menu icon (<strong>⋮</strong>) at the top-right.</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">2.</span><span
								>Select <strong>Add to Home screen</strong>.</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">3.</span><span>Press <strong>Install</strong>.</span>
						</li>
					</ol>
				</div>

				<Separator />

				<!-- iOS -->
				<div class="space-y-3">
					<h2 class="text-lg font-bold">iOS (Safari)</h2>
					<ol class="space-y-3 text-sm">
						<li class="flex gap-3">
							<span class="font-medium">1.</span><span
								>Tap the <strong>Share</strong> button (square with arrow).</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">2.</span><span
								>Scroll down and tap <strong>Add to Home Screen</strong>.</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">3.</span><span
								>Tap <strong>Add</strong> in the top-right.</span
							>
						</li>
					</ol>
				</div>

				<Separator />

				<!-- Instagram in-app Browser -->
				<div class="space-y-3">
					<h2 class="text-lg font-bold">Using Instagram</h2>
					<p class="text-sm">
						Instagram opens links inside its own browser, which doesn't allow installation. Follow
						these steps:
					</p>
					<ol class="space-y-3 text-sm">
						<li class="flex gap-3">
							<span class="font-medium">1.</span><span
								>Tap the <strong>three dots</strong> (⋯) in the top-right of the Instagram browser.</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">2.</span><span
								>Select <strong>Open in Browser</strong>.</span
							>
						</li>
						<li class="flex gap-3">
							<span class="font-medium">3.</span><span
								>Then follow the Android or iOS steps above based on your device.</span
							>
						</li>
					</ol>
				</div>
			</CardContent>
		</Card>

		<p class="text-muted-foreground text-center text-xs">
			After installation, HelpLink will appear on your home screen just like any other app.
		</p>
	</div>
</div>
