import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  isFeatureFilterId,
  spaMatchesFeatureFilters,
  type FeatureFilterId,
} from "../lib/filters";
import {
  getCityFromSlug,
  getCitySlug,
  getFeatureIdsFromSearchParams,
} from "../lib/filter-url";
import { getSpaTagGroups } from "../lib/tag-groups";
import type { Coordinates, Spa } from "../lib/types";

const TOKATSU_CENTER: Coordinates = { lat: 35.855, lng: 139.945 };
const PROTOTYPE_INITIAL_CENTER: Coordinates = { lat: 35.835, lng: 139.93 };
const INITIAL_ZOOM = 11;
const PROTOTYPE_INITIAL_ZOOM = 12;
const FILTER_MAX_ZOOM = 13;

const pinIcon = L.icon({
  iconUrl: "/pin.svg",
  iconSize: [28, 45],
  iconAnchor: [14, 45],
  popupAnchor: [0, -38],
  className: "prototype-leaflet-pin",
});

const transportNotes = new Map<string, string>([
  ["yuraku-no-sato-matsudo", "松戸駅からバスで約10分"],
  ["spa-metsa-otaka", "流山おおたかの森駅から徒歩圏"],
  ["sumire-minami-kashiwa", "南柏駅から徒歩圏"],
  ["aquaignis-yoshikawa-minami", "吉川美南駅から徒歩圏"],
]);

const appendText = <K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tagName: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
};

const appendIcon = (
  parent: HTMLElement,
  iconClass: string,
  extraClassName?: string,
) => {
  const icon = document.createElement("span");
  icon.className = ["prototype-icon", iconClass, extraClassName]
    .filter(Boolean)
    .join(" ");
  icon.setAttribute("aria-hidden", "true");
  parent.append(icon);
  return icon;
};

const createSelectedCard = (spa: Spa) => {
  const card = document.createElement("article");
  card.className = "prototype-selected-card";

  const body = document.createElement("div");
  body.className = "prototype-place-body";

  const title = document.createElement("h2");
  title.className = "prototype-place-title";
  appendText(title, "span", spa.name);
  body.append(title);

  const tagGroups = getSpaTagGroups(spa);
  const detailList = document.createElement("div");
  detailList.className = "prototype-place-detail-list";

  if (tagGroups.length > 0) {
    const featureRow = document.createElement("div");
    featureRow.className = "prototype-place-detail-row";
    appendText(featureRow, "span", "特徴", "prototype-place-detail-label");

    const features = document.createElement("div");
    features.className = "prototype-place-features";
    features.setAttribute("role", "group");
    features.setAttribute("aria-label", `${spa.name}の特徴`);

    tagGroups.forEach((group) => {
      const groupElement = document.createElement("div");
      groupElement.className = "prototype-feature-group";
      appendText(groupElement, "span", group.label, "prototype-feature-label");

      const tagList = document.createElement("ul");
      tagList.className = "prototype-feature-tags";
      group.tags.forEach((tag) => {
        const item = document.createElement("li");
        appendText(item, "span", tag);
        tagList.append(item);
      });

      groupElement.append(tagList);
      features.append(groupElement);
    });

    featureRow.append(features);
    detailList.append(featureRow);
  }

  const addressRow = document.createElement("div");
  addressRow.className = "prototype-place-detail-row";
  appendText(addressRow, "span", "住所", "prototype-place-detail-label");
  const address = document.createElement("address");
  address.className = "prototype-place-detail";
  appendIcon(address, "prototype-icon--map-pin");
  appendText(address, "span", spa.address);
  addressRow.append(address);
  detailList.append(addressRow);

  const transport = transportNotes.get(spa.id);
  if (transport) {
    const transportDetailRow = document.createElement("div");
    transportDetailRow.className = "prototype-place-detail-row";
    appendText(
      transportDetailRow,
      "span",
      "アクセス",
      "prototype-place-detail-label",
    );
    const transportRow = document.createElement("p");
    transportRow.className = "prototype-place-detail";
    appendIcon(transportRow, "prototype-icon--bus");
    appendText(transportRow, "span", transport);
    transportDetailRow.append(transportRow);
    detailList.append(transportDetailRow);
  }

  body.append(detailList);

  const actions = document.createElement("div");
  actions.className = "prototype-place-actions";

  const googleMapsLink = document.createElement("a");
  googleMapsLink.className =
    "prototype-place-action prototype-place-action--primary";
  googleMapsLink.href = spa.googleMapsUrl;
  googleMapsLink.target = "_blank";
  googleMapsLink.rel = "noopener noreferrer";
  googleMapsLink.setAttribute("aria-label", `${spa.name}をGoogleマップで開く`);
  appendIcon(googleMapsLink, "prototype-icon--map");
  appendText(googleMapsLink, "span", "Google マップ");

  const officialLink = document.createElement("a");
  officialLink.className = "prototype-place-action";
  officialLink.href = spa.officialUrl;
  officialLink.target = "_blank";
  officialLink.rel = "noopener noreferrer";
  officialLink.setAttribute("aria-label", `${spa.name}の公式サイトを開く`);
  appendIcon(officialLink, "prototype-icon--external");
  appendText(officialLink, "span", "公式サイト");

  actions.append(googleMapsLink, officialLink);
  body.append(actions);

  card.append(body);
  return card;
};

const initPrototypeMap = () => {
  const mapElement = document.querySelector<HTMLElement>(
    "#prototype-map-canvas",
  );
  if (!mapElement || mapElement.dataset.ready === "true") return;
  mapElement.dataset.ready = "true";

  const spas: Spa[] = JSON.parse(mapElement.dataset.spas ?? "[]");
  const cityButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-prototype-city]"),
  );
  const featureButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-prototype-feature]"),
  );
  const statusElement = document.querySelector<HTMLElement>(
    "[data-prototype-status]",
  );
  const clearButton = document.querySelector<HTMLButtonElement>(
    "[data-prototype-clear]",
  );
  const panelElement = document.querySelector<HTMLElement>(
    "[data-prototype-panel]",
  );
  const cardHost = document.querySelector<HTMLElement>("[data-prototype-card]");
  const gripButton = document.querySelector<HTMLButtonElement>(
    "[data-prototype-grip]",
  );

  const markers = new Map<string, L.Marker>();
  let activeCity = "all";
  let activeFeatureIds = new Set<FeatureFilterId>();
  let selectedSpaId = "";
  let suppressGripClick = false;

  const getCityFromUrl = (searchParams: URLSearchParams) => {
    const citySlug = searchParams.get("city");
    if (!citySlug) return "all";

    const city = getCityFromSlug(citySlug) ?? citySlug;
    return cityButtons.some((button) => button.dataset.prototypeCity === city)
      ? city
      : "all";
  };

  const syncStateFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    activeCity = getCityFromUrl(searchParams);
    activeFeatureIds = new Set(getFeatureIdsFromSearchParams(searchParams));
  };

  const updateUrl = () => {
    const url = new URL(window.location.href);

    if (activeCity === "all") {
      url.searchParams.delete("city");
    } else {
      url.searchParams.set("city", getCitySlug(activeCity));
    }

    if (activeFeatureIds.size === 0) {
      url.searchParams.delete("features");
    } else {
      url.searchParams.set("features", [...activeFeatureIds].join(","));
    }
    url.searchParams.delete("tags");

    window.history.replaceState({}, "", url);
  };

  const map = L.map(mapElement, {
    zoomControl: false,
    preferCanvas: true,
  });

  L.tileLayer(
    "https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution:
        '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">&copy; OpenMapTiles</a> ' +
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>',
      className: "prototype-map-tile",
      detectRetina: true,
    },
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const getVisibleSpas = () =>
    spas.filter(
      (spa) =>
        (activeCity === "all" || spa.city === activeCity) &&
        spaMatchesFeatureFilters(spa, activeFeatureIds),
    );

  const fitVisibleMarkers = (maxZoom = FILTER_MAX_ZOOM) => {
    const visibleMarkers = getVisibleSpas()
      .map((spa) => markers.get(spa.id))
      .filter((marker): marker is L.Marker => Boolean(marker));

    if (visibleMarkers.length === 0) return;

    const bounds = L.featureGroup(visibleMarkers).getBounds().pad(0.22);
    map.fitBounds(bounds, { animate: false, maxZoom });
  };

  const updateMarkerSelection = () => {
    markers.forEach((marker, id) => {
      const isSelected = id === selectedSpaId;
      marker.setZIndexOffset(isSelected ? 1000 : 0);
      marker.getElement()?.classList.toggle("is-selected", isSelected);
    });
  };

  const updateResultCopy = (visibleSpas = getVisibleSpas()) => {
    if (statusElement) {
      statusElement.textContent = `${visibleSpas.length}件`;
    }
  };

  const openPanel = () => {
    if (panelElement) panelElement.style.transform = "";
    panelElement?.classList.add("is-open");
    panelElement?.removeAttribute("aria-hidden");
  };

  const closePanel = () => {
    if (panelElement) {
      panelElement.style.transform = "";
      if (panelElement.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
      }
    }
    panelElement?.classList.remove("is-open");
    panelElement?.setAttribute("aria-hidden", "true");
  };

  const clearSelection = () => {
    selectedSpaId = "";
    cardHost?.replaceChildren();
    closePanel();
    panelElement?.classList.remove("has-selection");
    updateMarkerSelection();
    updateResultCopy();
  };

  const selectSpa = (spaId: string) => {
    const spa = spas.find((item) => item.id === spaId);
    if (!spa || !cardHost) return;

    selectedSpaId = spa.id;
    panelElement?.classList.add("has-selection");
    cardHost.replaceChildren(createSelectedCard(spa));
    updateMarkerSelection();
    updateResultCopy();
    openPanel();
  };

  const updateFilterUi = () => {
    cityButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.prototypeCity === activeCity),
      );
    });

    featureButtons.forEach((button) => {
      const id = button.dataset.prototypeFeature;
      button.setAttribute(
        "aria-pressed",
        String(Boolean(id && activeFeatureIds.has(id as FeatureFilterId))),
      );
    });

    const visibleSpas = getVisibleSpas();
    const hasActiveFilters = activeCity !== "all" || activeFeatureIds.size > 0;
    updateResultCopy(visibleSpas);
    if (clearButton) clearButton.hidden = !hasActiveFilters;
  };

  const applyFilters = (shouldUpdateUrl = true) => {
    const visibleIds = new Set(getVisibleSpas().map((spa) => spa.id));

    markers.forEach((marker, id) => {
      if (visibleIds.has(id)) {
        marker.addTo(map);
      } else {
        marker.remove();
      }
    });

    updateFilterUi();
    fitVisibleMarkers();

    if (selectedSpaId && visibleIds.has(selectedSpaId)) {
      selectSpa(selectedSpaId);
    } else {
      clearSelection();
    }
    if (shouldUpdateUrl) updateUrl();
  };

  map.setView(
    spas.length > 0
      ? [PROTOTYPE_INITIAL_CENTER.lat, PROTOTYPE_INITIAL_CENTER.lng]
      : [TOKATSU_CENTER.lat, TOKATSU_CENTER.lng],
    spas.length > 0 ? PROTOTYPE_INITIAL_ZOOM : INITIAL_ZOOM,
  );

  spas.forEach((spa) => {
    const marker = L.marker([spa.lat, spa.lng], {
      icon: pinIcon,
      title: spa.name,
    }).addTo(map);

    marker.on("click", () => selectSpa(spa.id));
    marker.bindTooltip(spa.name, {
      direction: "top",
      offset: [0, -38],
      opacity: 1,
    });
    markers.set(spa.id, marker);
  });

  cityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCity = button.dataset.prototypeCity ?? "all";
      applyFilters();
    });
  });

  featureButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.prototypeFeature;
      if (!id || !isFeatureFilterId(id)) return;

      if (activeFeatureIds.has(id)) {
        activeFeatureIds.delete(id);
      } else {
        activeFeatureIds.add(id);
      }
      applyFilters();
    });
  });

  clearButton?.addEventListener("click", () => {
    activeCity = "all";
    activeFeatureIds = new Set();
    applyFilters();
  });

  window.addEventListener("popstate", () => {
    syncStateFromUrl();
    applyFilters(false);
  });

  gripButton?.addEventListener("pointerdown", (event) => {
    if (!panelElement?.classList.contains("is-open")) return;

    const pointerId = event.pointerId;
    const panelHeight = panelElement.getBoundingClientRect().height;
    const dismissDistance = Math.min(110, panelHeight * 0.38);
    const startY = event.clientY;
    let currentY = event.clientY;
    let previousY = event.clientY;
    let previousTime = event.timeStamp;
    let velocityY = 0;
    let didDrag = false;

    panelElement.classList.add("is-dragging");
    gripButton.setPointerCapture(pointerId);

    const stopDrag = () => {
      panelElement.classList.remove("is-dragging");
      gripButton.releasePointerCapture(pointerId);
      gripButton.removeEventListener("pointermove", handleMove);
      gripButton.removeEventListener("pointerup", handleEnd);
      gripButton.removeEventListener("pointercancel", handleCancel);
    };

    const handleMove = (moveEvent: PointerEvent) => {
      currentY = moveEvent.clientY;
      const dragY = Math.max(0, currentY - startY);
      const elapsed = Math.max(1, moveEvent.timeStamp - previousTime);
      velocityY = (currentY - previousY) / elapsed;
      previousY = currentY;
      previousTime = moveEvent.timeStamp;

      if (dragY > 4) didDrag = true;
      panelElement.style.transform = `translateY(${dragY}px)`;
    };

    const handleEnd = () => {
      const dragY = Math.max(0, currentY - startY);
      const shouldDismiss = dragY >= dismissDistance || velocityY > 0.55;
      suppressGripClick = didDrag;
      stopDrag();

      if (shouldDismiss) {
        closePanel();
        return;
      }

      panelElement.style.transform = "";
    };

    const handleCancel = () => {
      suppressGripClick = didDrag;
      stopDrag();
      panelElement.style.transform = "";
    };

    gripButton.addEventListener("pointermove", handleMove);
    gripButton.addEventListener("pointerup", handleEnd);
    gripButton.addEventListener("pointercancel", handleCancel);
  });

  gripButton?.addEventListener("click", () => {
    if (suppressGripClick) {
      suppressGripClick = false;
      return;
    }

    if (panelElement?.classList.contains("is-open")) {
      closePanel();
      return;
    }
    if (selectedSpaId) selectSpa(selectedSpaId);
  });

  syncStateFromUrl();
  applyFilters(false);
  clearSelection();
};

document.addEventListener("astro:page-load", initPrototypeMap);
initPrototypeMap();
