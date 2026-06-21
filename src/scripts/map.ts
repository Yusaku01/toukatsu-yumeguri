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
  getSpaIdFromSearchParams,
} from "../lib/filter-url";
import type { Coordinates, Spa } from "../lib/types";
import {
  loadUserState,
  saveUserState,
  setLastFilters,
} from "../lib/user-state";
import { createPlaceCard } from "./place-card";
import { bindPlaceSheetGrip } from "./place-sheet";
import { bindYumeguriProgress } from "./user-progress";
import {
  bindUserStateControls,
  refreshUserStateControls,
} from "./user-state-controls";

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
  let refreshProgress = () => {};

  const hasFilterParams = (searchParams: URLSearchParams) =>
    searchParams.has("city") ||
    searchParams.has("features") ||
    searchParams.has("tags");

  const hasUrlStateParams = (searchParams: URLSearchParams) =>
    hasFilterParams(searchParams) || searchParams.has("spa");

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
    const savedFilters = loadUserState().lastFilters;
    selectedSpaId = "";

    if (!hasUrlStateParams(searchParams) && savedFilters) {
      const savedCity = savedFilters.citySlug
        ? (getCityFromSlug(savedFilters.citySlug) ?? savedFilters.citySlug)
        : "all";
      activeCity = cityButtons.some(
        (button) => button.dataset.prototypeCity === savedCity,
      )
        ? savedCity
        : "all";
      activeFeatureIds = new Set(
        (savedFilters.featureIds ?? []).filter(isFeatureFilterId),
      );
      return;
    }

    activeCity = getCityFromUrl(searchParams);
    activeFeatureIds = new Set(getFeatureIdsFromSearchParams(searchParams));
    selectedSpaId =
      getSpaIdFromSearchParams(
        searchParams,
        spas.map((spa) => spa.id),
      ) ?? "";
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

    if (selectedSpaId) {
      url.searchParams.set("spa", selectedSpaId);
    } else {
      url.searchParams.delete("spa");
    }

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

  const refreshMapLayout = () => {
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 260);
  };

  const openPanel = () => {
    if (panelElement) panelElement.style.transform = "";
    panelElement?.classList.add("is-open");
    panelElement?.removeAttribute("aria-hidden");
    refreshMapLayout();
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
    refreshMapLayout();
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
    cardHost.replaceChildren(createPlaceCard(spa));
    refreshUserStateControls(cardHost);
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
    refreshProgress();
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
    if (shouldUpdateUrl) {
      updateUrl();
      saveUserState(
        setLastFilters(loadUserState(), {
          citySlug: activeCity === "all" ? undefined : getCitySlug(activeCity),
          featureIds: [...activeFeatureIds],
          sortMode: "default",
        }),
      );
    }
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

    marker.on("click", () => {
      selectSpa(spa.id);
      updateUrl();
    });
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

  bindPlaceSheetGrip({
    sheet: panelElement,
    gripButton,
    closeSheet: closePanel,
    openSheet: () => {
      if (selectedSpaId) selectSpa(selectedSpaId);
    },
  });

  syncStateFromUrl();
  refreshProgress = bindYumeguriProgress(
    document.querySelector<HTMLElement>(".prototype-map") ?? mapElement,
    spas,
    () => activeCity,
  );
  applyFilters(false);
  bindUserStateControls(mapElement.closest(".prototype-map") ?? mapElement);
};

document.addEventListener("astro:page-load", initPrototypeMap);
initPrototypeMap();
