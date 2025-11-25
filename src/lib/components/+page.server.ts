export function load({ locals }) {
  return {
    user: locals.pb.authStore.model,
  };
}
