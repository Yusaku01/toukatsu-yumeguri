import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance, getDistanceInMeters } from "../lib/geo";
import type { Coordinates, Spa } from "../lib/types";

const TOKATSU_CENTER: Coordinates = { lat: 35.855, lng: 139.945 };
const INITIAL_MAP_ZOOM = 11;
const DESKTOP_MAX_INITIAL_MAP_ZOOM = 13;
const FILTER_MAX_MAP_ZOOM = 13;
const MOBILE_MAX_INITIAL_MAP_ZOOM = 9;

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

  const chips = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-city-filter]"),
  );
  const listElement = document.querySelector<HTMLElement>("[data-spa-list]");
  const panelElement = document.querySelector<HTMLElement>("[data-map-panel]");
  const shellElement = document.querySelector<HTMLElement>(".map-shell");
  const spas: Spa[] = JSON.parse(mapElement.dataset.spas ?? "[]");
  const markers = new Map<string, L.Marker>();
  const hoverTooltipQuery = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );
  const mobileInitialViewQuery = window.matchMedia("(max-width: 900px)");
  let activeCity = "all";
  let currentLocation: Coordinates | undefined;
  let currentLocationMarker: L.CircleMarker | undefined;
  let locateButton: HTMLAnchorElement | undefined;
  let selectedSpaId: string | undefined;

  const map = L.map(mapElement, {
    zoomControl: false,
    preferCanvas: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    keepBuffer: 0,
    maxZoom: 19,
    updateWhenIdle: true,
    updateWhenZooming: false,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const locateControl = L.Control.extend({
    options: {
      position: "bottomright",
    },

    onAdd(controlMap: L.Map) {
      const container = L.DomUtil.create(
        "div",
        "leaflet-control-locate leaflet-bar leaflet-control",
      );
      const button = L.DomUtil.create("a", "", container);
      button.href = "#";
      button.title = "現在地を表示";
      button.role = "button";
      button.setAttribute("aria-label", "現在地を表示");
      button.setAttribute("aria-disabled", "false");
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"></circle>
        </svg>
      `;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.preventDefault(event);
        if (button.getAttribute("aria-disabled") === "true") return;

        locateButton = button;
        locateButton.setAttribute("aria-disabled", "true");

        controlMap.locate({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
          setView: false,
        });
      });

      locateButton = button;
      return container;
    },
  });

  map.addControl(new locateControl());

  const getVisibleSpas = () =>
    spas.filter((spa) => activeCity === "all" || spa.city === activeCity);

  const getInitialMaxZoom = () =>
    mobileInitialViewQuery.matches
      ? MOBILE_MAX_INITIAL_MAP_ZOOM
      : DESKTOP_MAX_INITIAL_MAP_ZOOM;

  const fitVisibleMarkers = (maxZoom = FILTER_MAX_MAP_ZOOM) => {
    const visibleMarkers = getVisibleSpas()
      .map((spa) => markers.get(spa.id))
      .filter((marker): marker is L.Marker => Boolean(marker));

    if (visibleMarkers.length === 0) return;

    const bounds = L.featureGroup(visibleMarkers).getBounds().pad(0.22);
    map.fitBounds(bounds, { animate: false, maxZoom });
  };

  const openPanel = () => {
    if (!panelElement) return;

    panelElement.classList.add("is-open");
    panelElement.removeAttribute("aria-hidden");
    shellElement?.classList.add("is-panel-open");
    panelElement.dispatchEvent(new CustomEvent("spa-panel-open"));
  };

  const closePanel = () => {
    if (!panelElement) return;

    selectedSpaId = undefined;
    panelElement.classList.remove("is-open");
    panelElement.setAttribute("aria-hidden", "true");
    panelElement.setAttribute("aria-expanded", "false");
    shellElement?.classList.remove("is-panel-open");
    listElement?.replaceChildren();
  };

  panelElement?.addEventListener("spa-panel-close", closePanel);

  const appendTextElement = (
    parent: HTMLElement,
    tagName: keyof HTMLElementTagNameMap,
    text: string,
    className?: string,
  ) => {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  };

  const createSelectedCard = (spa: Spa) => {
    const card = document.createElement("article");
    card.className = "spa-card";
    card.dataset.spaCard = spa.id;
    card.dataset.selected = "";

    const main = document.createElement("div");
    main.className = "spa-card-main";

    const meta = document.createElement("p");
    meta.className = "spa-meta";
    appendTextElement(meta, "span", spa.city);
    if (spa.area) appendTextElement(meta, "span", spa.area);
    if (currentLocation) {
      appendTextElement(
        meta,
        "span",
        formatDistance(getDistanceInMeters(currentLocation, spa)),
      );
    }

    appendTextElement(main, "h2", spa.name);
    main.prepend(meta);

    if (spa.notes) appendTextElement(main, "p", spa.notes, "spa-summary");

    const details = document.createElement("div");
    details.className = "spa-detail-list";

    const addressRow = document.createElement("div");
    addressRow.className = "spa-detail-row";
    appendTextElement(addressRow, "span", "住所", "spa-detail-label");
    const address = appendTextElement(addressRow, "address", spa.address);
    address.setAttribute("translate", "no");
    details.append(addressRow);

    if (spa.tags.length > 0) {
      const featureRow = document.createElement("div");
      featureRow.className = "spa-detail-row";
      appendTextElement(featureRow, "span", "特徴", "spa-detail-label");
      const tagList = document.createElement("ul");
      tagList.className = "tag-list";
      tagList.setAttribute("aria-label", `${spa.name}の特徴`);
      spa.tags.forEach((tag) => appendTextElement(tagList, "li", tag));
      featureRow.append(tagList);
      details.append(featureRow);
    }

    main.append(details);

    const actions = document.createElement("div");
    actions.className = "spa-actions";

    const googleMapsLink = document.createElement("a");
    googleMapsLink.className = "external-link primary-link";
    googleMapsLink.href = spa.googleMapsUrl;
    googleMapsLink.target = "_blank";
    googleMapsLink.rel = "noopener noreferrer";
    googleMapsLink.textContent = "Google マップ";

    const officialLink = document.createElement("a");
    officialLink.className = "external-link";
    officialLink.href = spa.officialUrl;
    officialLink.target = "_blank";
    officialLink.rel = "noopener noreferrer";
    officialLink.textContent = "公式サイト";

    actions.append(googleMapsLink, officialLink);
    card.append(main, actions);
    return card;
  };

  const selectSpa = (spaId: string) => {
    const spa = spas.find((item) => item.id === spaId);
    if (!spa || !listElement) return;

    selectedSpaId = spaId;
    openPanel();
    listElement.replaceChildren(createSelectedCard(spa));
  };

  if (spas.length > 0) {
    const bounds = L.latLngBounds(
      spas.map((spa) => [spa.lat, spa.lng] as L.LatLngTuple),
    ).pad(0.22);
    map.fitBounds(bounds, { animate: false, maxZoom: getInitialMaxZoom() });
  } else {
    map.setView([TOKATSU_CENTER.lat, TOKATSU_CENTER.lng], INITIAL_MAP_ZOOM);
  }

  spas.forEach((spa) => {
    const marker = L.marker([spa.lat, spa.lng], {
      icon: pinIcon,
      title: spa.name,
    }).addTo(map);

    marker.bindTooltip(
      `<strong>${spa.name}</strong><br><span>${spa.city}${spa.area ? ` / ${spa.area}` : ""}</span>`,
      {
        className: "spa-marker-tooltip",
        direction: "top",
        offset: [0, -42],
        opacity: 1,
      },
    );
    marker.on("mouseover", () => {
      if (hoverTooltipQuery.matches) marker.openTooltip();
    });
    marker.on("mouseout", () => marker.closeTooltip());
    marker.on("focus", () => {
      if (hoverTooltipQuery.matches) marker.openTooltip();
    });
    marker.on("blur", () => marker.closeTooltip());
    marker.on("click", () => selectSpa(spa.id));
    markers.set(spa.id, marker);
  });

  const applyFilter = (maxZoom = FILTER_MAX_MAP_ZOOM) => {
    const visibleIds = new Set(getVisibleSpas().map((spa) => spa.id));

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

    if (!selectedSpaId || !visibleIds.has(selectedSpaId)) {
      closePanel();
    } else {
      selectSpa(selectedSpaId);
    }
    fitVisibleMarkers(maxZoom);
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCity = chip.dataset.cityFilter ?? "all";
      applyFilter();
    });
  });

  map.on("locationfound", (event) => {
    currentLocation = {
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    };
    currentLocationMarker?.remove();
    currentLocationMarker = L.circleMarker(
      [currentLocation.lat, currentLocation.lng],
      {
        radius: 8,
        color: "#401306",
        fillColor: "#ff7442",
        fillOpacity: 0.85,
        weight: 3,
      },
    )
      .bindPopup("現在地")
      .addTo(map);
    map.setView([currentLocation.lat, currentLocation.lng], 12);
    if (selectedSpaId) selectSpa(selectedSpaId);
    locateButton?.setAttribute("aria-disabled", "false");
  });

  map.on("locationerror", () => {
    locateButton?.setAttribute("aria-disabled", "false");
  });

  closePanel();
  applyFilter(getInitialMaxZoom());
};

document.addEventListener("astro:page-load", initMapPage);
initMapPage();
