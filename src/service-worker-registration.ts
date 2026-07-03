export const SERVICE_WORKER_URL = "/ponpoko/service-worker.js";
export const SERVICE_WORKER_SCOPE = "/ponpoko/";

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE
    })
      .then((registration) => registration.update())
      .catch(() => undefined);
  };

  if (document.readyState === "complete") {
    register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}
