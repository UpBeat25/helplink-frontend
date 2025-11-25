import { pb } from "$lib/pocketbase";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const username = params.username;

  // Get user by username
  const user = await pb
    .collection("users")
    .getFirstListItem(`username = "${username}"`);

  // Fetch user tasks
  const tasks = await pb.collection("tasks").getFullList({
    filter: `uploaded_by = "${user.id}"`,
    sort: "-created",
  });

  // Fetch volunteer activity
  const statuses = await pb.collection("status").getFullList({
    filter: `user = "${user.id}"`,
    expand: "volunteered_task_id",
    sort: "-created",
  });

  return { user, tasks, statuses };
};