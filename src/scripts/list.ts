import { formatDistance, getDistanceInMeters } from "../lib/geo";
import type { Coordinates, Spa } from "../lib/types";

const locateButton =
  document.querySelector<HTMLButtonElement>("[data-locate-list]");
const statusElement = document.querySelector<HTMLElement>(
  "[data-location-status]",
);
const listElement = document.querySelector<HTMLElement>("[data-spa-list]");
const cards = Array.from(
  document.querySelectorAll<HTMLElement>("[data-spa-card]"),
);
const dataElement = document.querySelector<HTMLElement>("[data-spas-json]");
const spas: Spa[] = JSON.parse(dataElement?.dataset.spas ?? "[]");

const updateDistances = (currentLocation: Coordinates) => {
  cards.forEach((card) => {
    const spa = spas.find((item) => item.id === card.dataset.spaCard);
    const distanceElement = card.querySelector<HTMLElement>("[data-distance]");
    if (!spa || !distanceElement) return;

    distanceElement.textContent = formatDistance(
      getDistanceInMeters(currentLocation, spa),
    );
    distanceElement.hidden = false;
  });
};

locateButton?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    if (statusElement)
      statusElement.textContent = "現在地を取得できない環境です";
    return;
  }

  locateButton.disabled = true;
  if (statusElement) statusElement.textContent = "現在地を確認しています";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      updateDistances(currentLocation);
      cards
        .map((card) => {
          const spa = spas.find((item) => item.id === card.dataset.spaCard);
          return {
            card,
            distance: spa
              ? getDistanceInMeters(currentLocation, spa)
              : Infinity,
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .forEach(({ card }) => listElement?.append(card));
      if (statusElement) statusElement.textContent = "近い順に並べました";
      locateButton.disabled = false;
    },
    () => {
      if (statusElement)
        statusElement.textContent = "現在地は許可されませんでした";
      locateButton.disabled = false;
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  );
});
