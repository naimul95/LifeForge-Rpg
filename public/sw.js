const SERVICE_WORKER_VERSION = "lifeforge-rpg-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.info(`${SERVICE_WORKER_VERSION} active`);
    }),
  );
});