import { pb } from "$lib/pocketbase";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const username = params.username;

  // Get user by username
  const user = await pb
    .collection("users")
    .getFirstListItem(`username = "${username}"`);

  return { user };
};
