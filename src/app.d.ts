// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type PocketBase from "pocketbase";
import type { RecordModel } from "pocketbase";

declare global {
  namespace App {
    interface Locals {
      pb: PocketBase;
      user_xyz: import("pocketbase").RecordModel | null;
    }
  }
}

declare module "svelte-maplibre";
export {};
