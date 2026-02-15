if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const reg = await navigator.serviceWorker.register("./sw.js");

    // Ask the browser to check for updates each time the page loads
    reg.update();

    // When a new service worker takes control, reload once to use fresh assets
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}