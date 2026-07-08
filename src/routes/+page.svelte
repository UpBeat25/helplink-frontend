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
	import MoveDown from '@lucide/svelte/icons/move-down';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
</script>

<div class="back flex min-h-screen items-center justify-center p-6 font-mono">
	<div class="w-full max-w-md space-y-10">
		<article class="flex h-screen flex-col items-center justify-center space-y-6">
			<div class="space-y-2 text-center">
				<h1 class="text-7xl font-bold tracking-tight">HelpLink.</h1>
				<p class="text-sm">Get Help. Give Help. Build Community.</p>
			</div>

			<div class="absolute bottom-7 text-center">
				<MoveDown class="h-8 w-8 animate-bounce" />
			</div>
		</article>

		<article class="what-is-it space-y-3 p-3">
			<div class="space-y-2 text-center">
				<h1 class="text-4xl font-bold tracking-tight">What is HelpLink?</h1>
			</div>

			<!-- Main Card -->
			<Card class="items-home p-2 shadow-lg">
				<CardHeader class="mt-3">
					<CardDescription class="text-black">
						<b>HelpLink</b> is a <b>community-driven platform</b> that connects people who need help
						with nearby volunteers willing to give their
						<b>time, skills, or support</b>. Whether it’s helping someone move
						<b
							>furniture, assisting with studies, supporting local events, or participating in NGO
							initiatives</b
						>, HelpLink makes volunteering <b>simple, accessible, and meaningful</b> through real-time
						local connections.
					</CardDescription>
				</CardHeader>
			</Card>
		</article>

		<article class="how-it-works space-y-3 p-3">
			<div class="space-y-2 text-center">
				<h1 class="text-4xl font-bold tracking-tight">How does it work?</h1>
			</div>

			<!-- Main Card -->
			<Card class="items-home p-2 shadow-lg">
				<CardHeader class="mt-3">
					<CardDescription class="text-black">
						Users can post <b>requests</b> describing the help they need, and
						<b>nearby volunteers</b>
						can view and respond to those requests in <b>real time</b>. The requester can then
						<b>accept or reject</b>
						volunteers, making it easy to connect with <b>trusted people</b> in the community.
						<b>Organizations and NGOs</b> can also host
						<b>volunteering events and community initiatives</b>
						through HelpLink, helping more people discover meaningful ways to
						<b>contribute locally.</b>
					</CardDescription>
				</CardHeader>
			</Card>
		</article>
		<article class="why-should-we-trust-it space-y-3 p-3">
			<div class="space-y-2 text-center">
				<h1 class="text-4xl font-bold tracking-tight">Why should we trust HelpLink?</h1>
			</div>

			<!-- Main Card -->
			<Card class="items-home p-2 shadow-lg">
				<CardHeader class="mt-3">
					<CardDescription class="text-black">
						HelpLink is built around <b>transparency, safety, and community.</b> The platform is
						completely open source, created purely to help people and communities without
						<b>payments or intrusive ads</b>. You can even explore the code yourself on
						<b
							><a
								href="https://github.com/UpBeat25/helplink-frontend"
								target="_blank"
								class="text-black underline underline-offset-2 transition hover:text-blue-300"
								>GitHub</a
							></b
						>. User data and passwords are securely handled through
						<b
							><a
								href="https://pocketbase.io"
								target="_blank"
								class="text-black underline underline-offset-2 transition hover:text-blue-300"
								>Pocketbase</a
							></b
						>, and users stay in control by choosing who can volunteer for their requests. To
						maintain <b>trust and authenticity</b>, volunteering events can only be hosted by
						<b>verified NGOs and organizations</b>, helping ensure that HelpLink remains a
						<b>safe and reliable</b> community platform.
					</CardDescription>
				</CardHeader>
			</Card>
		</article>

		<article class="flex h-screen flex-col items-center justify-center space-y-6">
			<div class="space-y-2 text-center">
				<h1 class="text-5xl font-bold tracking-tight">Our Partners</h1>
				<p class="text-sm">
					We express our heartfelt gratitude to all the organizations that have partnered with us to
					support the mission of making a more inclusive community and to honour their
					contributions, we have created a seperate page to show their journey with us!
				</p>
			</div>

			<Button
				variant="outline_m"
				size="lg"
				type="button"
				class="questions"
				onclick={() => {
					goto('/partners');
				}}><span class="flex underline">Visit <ArrowUpRight /></span></Button
			>
		</article>
		<article class="install">
			<div class="space-y-2 text-center">
				<h1 class="text-4xl font-bold tracking-tight">Installation</h1>
				<p class="text-m">Install HelpLink on your device for a fast, app-like experience.</p>
			</div>

			<!-- Main Card -->
			<Card class="items-home mt-3 p-2 shadow-lg">
				<CardHeader class="mt-3">
					<CardTitle class="text-xl font-semibold">How to Install</CardTitle>
					<CardDescription>Choose your device or platform below.</CardDescription>
				</CardHeader>

				<CardContent class="space-y-4 pb-3">
					<Separator />
					<!-- ANDROID -->
					<div class="space-y-3">
						<div class="flex gap-3">
							<h2 class="flex text-lg font-bold" style="letter-spacing: -1px">
								<span style="color: #1970e0; margin-right: 2px">C</span>
								<span style="color: #d63426; margin-right: 2px">h</span>
								<span style="color: #f2ba11; margin-right: 2px">r</span>
								<span style="color: #1970e0; margin-right: 2px">o</span>
								<span style="color: #299a49; margin-right: 2px">m</span>
								<span style="color: #d63426; margin-right: 2px">e</span>
							</h2>
						</div>
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
						<div class="flex">
							<h2 class="safari text-lg font-bold">Safari</h2>
						</div>
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
						<h2 class="text-lg font-bold"><span class="insta">Instagram</span></h2>
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

			<p class="mt-3 text-center text-xs">
				After installation, HelpLink will appear on your home screen just like any other app.
			</p>
		</article>
	</div>
</div>
<footer class="back_d h-30 w-full max-w-md space-y-10 bg-black">
	<div class="border-3 border-white p-3">
		<a href="/privacy_policy">Privacy Policy | Terms & Conditions</a>
	</div>
</footer>
