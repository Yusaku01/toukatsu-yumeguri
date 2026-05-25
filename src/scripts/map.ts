import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance, getDistanceInMeters } from "../lib/geo";
import type { Coordinates, Spa } from "../lib/types";

const TOKATSU_CENTER: Coordinates = { lat: 35.855, lng: 139.945 };

const pinIcon = L.icon({
  iconUrl: "/pin.svg",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [0, -42],
});

const initMapPage = () => {
  const mapElement = document.querySelector<HTMLElement>("#map");
  if (!mapElement || mapElement.dataset.ready === "true") return;

  mapElement.dataset.ready = "true";

  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-spa-card]"),
  );
  const chips = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-city-filter]"),
  );
  const locateButton =
    document.querySelector<HTMLButtonElement>("[data-locate]");
  const statusElement = document.querySelector<HTMLElement>(
    "[data-location-status]",
  );
  const countElement = document.querySelector<HTMLElement>(
    "[data-visible-count]",
  );
  const listElement = document.querySelector<HTMLElement>("[data-spa-list]");
  const spas: Spa[] = JSON.parse(mapElement.dataset.spas ?? "[]");
  const markers = new Map<string, L.Marker>();
  let activeCity = "all";
  let currentLocation: Coordinates | undefined;

  const map = L.map(mapElement, {
    zoomControl: false,
    preferCanvas: true,
  }).setView([TOKATSU_CENTER.lat, TOKATSU_CENTER.lng], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const getVisibleSpas = () =>
    spas.filter((spa) => activeCity === "all" || spa.city === activeCity);

  const updateCount = () => {
    if (!countElement) return;
    countElement.textContent = `${getVisibleSpas().length}件`;
  };

  const updateDistances = () => {
    if (!currentLocation) return;

    const origin = currentLocation;

    cards.forEach((card) => {
      const spa = spas.find((item) => item.id === card.dataset.spaCard);
      const distanceElement =
        card.querySelector<HTMLElement>("[data-distance]");

      if (!spa || !distanceElement) return;
      distanceElement.textContent = formatDistance(
        getDistanceInMeters(origin, spa),
      );
      distanceElement.hidden = false;
    });
  };

  const sortCardsByDistance = () => {
    if (!currentLocation || !listElement) return;

    const origin = currentLocation;

    cards
      .map((card) => {
        const spa = spas.find((item) => item.id === card.dataset.spaCard);
        return {
          card,
          distance: spa ? getDistanceInMeters(origin, spa) : Infinity,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .forEach(({ card }) => listElement.append(card));
  };

  const fitVisibleMarkers = () => {
    const visibleMarkers = getVisibleSpas()
      .map((spa) => markers.get(spa.id))
      .filter((marker): marker is L.Marker => Boolean(marker));

    if (visibleMarkers.length === 0) return;

    const bounds = L.featureGroup(visibleMarkers).getBounds().pad(0.22);
    map.fitBounds(bounds, { animate: false, maxZoom: 13 });
  };

  const selectSpa = (spaId: string) => {
    cards.forEach((card) => {
      const selected = card.dataset.spaCard === spaId;
      card.toggleAttribute("data-selected", selected);
      if (selected) {
        card.scrollIntoView({ block: "nearest" });
      }
    });
  };

  spas.forEach((spa) => {
    const marker = L.marker([spa.lat, spa.lng], {
      icon: pinIcon,
      title: spa.name,
    }).addTo(map);

    marker.bindPopup(
      `<strong>${spa.name}</strong><br><span>${spa.city}${spa.area ? ` / ${spa.area}` : ""}</span>`,
    );
    marker.on("click", () => selectSpa(spa.id));
    markers.set(spa.id, marker);
  });

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const spa = spas.find((item) => item.id === card.dataset.spaCard);
      if (!spa) return;

      selectSpa(spa.id);
      map.setView([spa.lat, spa.lng], 14);
      markers.get(spa.id)?.openPopup();
    });
  });

  const applyFilter = () => {
    const visibleIds = new Set(getVisibleSpas().map((spa) => spa.id));

    cards.forEach((card) => {
      card.hidden = !visibleIds.has(card.dataset.spaCard ?? "");
    });

    markers.forEach((marker, id) => {
      if (visibleIds.has(id)) {
        marker.addTo(map);
      } else {
        marker.remove();
      }
    });

    chips.forEach((chip) => {
      const selected = chip.dataset.cityFilter === activeCity;
      chip.setAttribute("aria-pressed", String(selected));
    });

    updateCount();
    fitVisibleMarkers();
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCity = chip.dataset.cityFilter ?? "all";
      applyFilter();
    });
  });

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
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        L.circleMarker([currentLocation.lat, currentLocation.lng], {
          radius: 8,
          color: "#401306",
          fillColor: "#ff7442",
          fillOpacity: 0.85,
          weight: 3,
        })
          .bindPopup("現在地")
          .addTo(map);
        map.setView([currentLocation.lat, currentLocation.lng], 12);
        updateDistances();
        sortCardsByDistance();
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

  applyFilter();
};

document.addEventListener("astro:page-load", initMapPage);
initMapPage();
