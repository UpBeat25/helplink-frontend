import { build, files, prerendered, version } from "$service-worker";
import { precacheAndRoute } from "workbox-precaching";

const excluded = ["/"]; // pages NOT to precache

const precache_list = [
  ...build,
  ...files,
  ...prerendered,
]
  .filter((url) => !excluded.includes(url))
  .map((s) => ({
    url: s,
    revision: version,
  }));

precacheAndRoute(precache_list);
