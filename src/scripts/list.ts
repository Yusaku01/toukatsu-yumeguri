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
import { formatDistance, getDistanceInMeters } from "../lib/geo";
import { sortSpasForDisplay } from "../lib/sort";
import type { Coordinates, Spa } from "../lib/types";

const initPrototypeList = () => {
  const root = document.querySelector<HTMLElement>("[data-prototype-list]");
  if (!root || root.dataset.ready === "true") return;
  root.dataset.ready = "true";

  const locateButton = root.querySelector<HTMLButtonElement>(
    "[data-prototype-locate]",
  );
  const locationStatusElement = root.querySelector<HTMLElement>(
    "[data-prototype-location-status]",
  );
  const filterStatusElement = root.querySelector<HTMLElement>(
    "[data-prototype-filter-status]",
  );
  const filterClearButton = root.querySelector<HTMLButtonElement>(
    "[data-prototype-filter-clear]",
  );
  const listElement = root.querySelector<HTMLElement>(
    "[data-prototype-spa-list]",
  );
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>("[data-prototype-spa-card]"),
  );
  const cityChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-prototype-city]"),
  );
  const featureChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-prototype-feature]"),
  );
  const dataElement = root.querySelector<HTMLElement>(
    "[data-prototype-spas-json]",
  );
  const spas: Spa[] = JSON.parse(dataElement?.dataset.spas ?? "[]");
  const cardsBySpaId = new Map(
    cards.map((card) => [card.dataset.prototypeSpaCard, card]),
  );

  let activeCity = "all";
  let activeFeatureIds = new Set<FeatureFilterId>();
  let currentLocation: Coordinates | undefined;

  const getCityFromUrl = (searchParams: URLSearchParams) => {
    const citySlug = searchParams.get("city");
    if (!citySlug) return "all";

    const city = getCityFromSlug(citySlug) ?? citySlug;
    return cityChips.some((chip) => chip.dataset.prototypeCity === city)
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

  const getVisibleSpas = () =>
    spas.filter(
      (spa) =>
        (activeCity === "all" || spa.city === activeCity) &&
        spaMatchesFeatureFilters(spa, activeFeatureIds),
    );

  const updateDistances = (location: Coordinates) => {
    cards.forEach((card) => {
      const spa = spas.find(
        (item) => item.id === card.dataset.prototypeSpaCard,
      );
      const distanceElement = card.querySelector<HTMLElement>(
        "[data-prototype-distance]",
      );
      if (!spa || !distanceElement) return;

      distanceElement.textContent = formatDistance(
        getDistanceInMeters(location, spa),
      );
      distanceElement.hidden = false;
    });
  };

  const applyFilter = (shouldUpdateUrl = true) => {
    const visibleSpas = sortSpasForDisplay(getVisibleSpas(), currentLocation);
    const visibleCards = visibleSpas
      .map((spa) => cardsBySpaId.get(spa.id))
      .filter((card): card is HTMLElement => Boolean(card));

    listElement?.replaceChildren(...visibleCards);

    cityChips.forEach((chip) => {
      chip.setAttribute(
        "aria-pressed",
        String(chip.dataset.prototypeCity === activeCity),
      );
    });

    featureChips.forEach((chip) => {
      const id = chip.dataset.prototypeFeature;
      const selected = Boolean(
        id && isFeatureFilterId(id) && activeFeatureIds.has(id),
      );
      chip.setAttribute("aria-pressed", String(selected));
    });

    const hasActiveFilters = activeCity !== "all" || activeFeatureIds.size > 0;
    if (filterStatusElement) {
      filterStatusElement.textContent = `${visibleSpas.length}件`;
    }
    if (filterClearButton) {
      filterClearButton.hidden = !hasActiveFilters;
    }
    if (shouldUpdateUrl) updateUrl();
  };

  cityChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCity = chip.dataset.prototypeCity ?? "all";
      applyFilter();
    });
  });

  featureChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.prototypeFeature;
      if (!id || !isFeatureFilterId(id)) return;

      if (activeFeatureIds.has(id)) {
        activeFeatureIds.delete(id);
      } else {
        activeFeatureIds.add(id);
      }
      applyFilter();
    });
  });

  filterClearButton?.addEventListener("click", () => {
    activeCity = "all";
    activeFeatureIds = new Set();
    applyFilter();
  });

  locateButton?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      if (locationStatusElement) {
        locationStatusElement.textContent = "現在地を取得できない環境です";
      }
      return;
    }

    locateButton.disabled = true;
    if (locationStatusElement) {
      locationStatusElement.textContent = "現在地を確認しています";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        updateDistances(currentLocation);
        applyFilter();
        if (locationStatusElement) {
          locationStatusElement.textContent = "近い順に並べました";
        }
        locateButton.disabled = false;
      },
      () => {
        if (locationStatusElement) {
          locationStatusElement.textContent = "現在地は許可されませんでした";
        }
        locateButton.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });

  window.addEventListener("popstate", () => {
    syncStateFromUrl();
    applyFilter(false);
  });

  syncStateFromUrl();
  applyFilter(false);
};

document.addEventListener("astro:page-load", initPrototypeList);
initPrototypeList();
