import PocketBase from "pocketbase";

export const pb = new PocketBase("https://api.helplink.dev"); //https://api.helplink.dev

// Override the send method for custom fetch behavior
const originalSend = pb.send.bind(pb);
pb.send = function (path: string, options: any) {
  // Your custom fetch logic here
  return originalSend(path, options);
};
