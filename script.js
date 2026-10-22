const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsGrid = document.getElementById("results");
const emptyState = document.getElementById("empty-state");
const searchButton = document.getElementById("search-btn");

let activeRequest;

function setStatus(message) {
  emptyState.textContent = message;
  emptyState.hidden = !message;
}

function render(items) {
  resultsGrid.replaceChildren();

  const imageItems = items.filter((item) => {
    return typeof item.imageinfo?.[0]?.thumburl === "string";
  });

  imageItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.src = item.imageinfo[0].thumburl;
    img.alt = item.title || "Wikimedia Commons image";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());

    const caption = document.createElement("p");
    caption.textContent = item.title || "Untitled image";

    card.append(img, caption);
    resultsGrid.appendChild(card);
  });

  return imageItems.length;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  resultsGrid.replaceChildren();
  setStatus("Searching...");
  searchButton.disabled = true;

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "300",
    format: "json",
    origin: "*",
  });

  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params}`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      throw new Error(`Wikimedia API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const items = Object.values(data.query?.pages ?? {});
    const count = render(items);

    if (count === 0) {
      setStatus("No images found. Try another search.");
    } else {
      setStatus("");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;

    console.error("Error fetching images:", error);
    setStatus("Unable to load images. Please try again.");
  } finally {
    if (activeRequest === controller) {
      activeRequest = undefined;
      searchButton.disabled = false;
    }
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.textContent.trim();
    form.requestSubmit();
  });
});