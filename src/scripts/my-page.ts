import type { Spa } from "../lib/types";
import {
  calculateYumeguriProgress,
  getYumeguriProgressCopy,
  syncCompletionStamps,
} from "../lib/user-progress";
import {
  clearUserState,
  hasStoredUserState,
  loadUserState,
  saveUserState,
} from "../lib/user-state";
import { createPlaceCard } from "./place-card";
import { bindPlaceSheetGrip } from "./place-sheet";
import {
  bindUserStateControls,
  refreshUserStateControls,
} from "./user-state-controls";

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

const createSavedSpaButton = (
  spa: Spa,
  {
    kind,
  }: {
    kind: "visited" | "interested";
  },
) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "prototype-visited-card",
    `prototype-visited-card--${kind}`,
  ].join(" ");
  button.dataset.yumeguriSavedCard = spa.id;
  button.dataset.yumeguriSavedCardKind = kind;
  button.setAttribute("aria-label", `${spa.name}の詳細を開く`);

  const meta = document.createElement("p");
  appendText(meta, "span", spa.city);
  if (spa.area) appendText(meta, "span", spa.area);

  const title = document.createElement("h3");
  title.textContent = spa.name;

  const affordance = document.createElement("span");
  affordance.className = "prototype-visited-card-affordance";
  appendIcon(affordance, "prototype-icon--chevron");

  button.append(meta, title, affordance);
  return button;
};

const createVisitedButton = (spa: Spa) =>
  createSavedSpaButton(spa, { kind: "visited" });

const createInterestedButton = (spa: Spa) =>
  createSavedSpaButton(spa, { kind: "interested" });

const initMyPage = () => {
  const root = document.querySelector<HTMLElement>("[data-yumeguri-my]");
  if (!root || root.dataset.ready === "true") return;
  root.dataset.ready = "true";

  const spas: Spa[] = JSON.parse(root.dataset.spas ?? "[]");
  const rows = Array.from(
    root.querySelectorAll<HTMLElement>("[data-yumeguri-progress-row]"),
  );
  const cityProgressSection = root.querySelector<HTMLElement>(
    "[data-yumeguri-city-progress-section]",
  );
  const visitedList = root.querySelector<HTMLElement>(
    "[data-yumeguri-visited-list]",
  );
  const interestedList = root.querySelector<HTMLElement>(
    "[data-yumeguri-interested-list]",
  );
  const emptyElement = root.querySelector<HTMLElement>(
    "[data-yumeguri-empty-visits]",
  );
  const emptyInterestsElement = root.querySelector<HTMLElement>(
    "[data-yumeguri-empty-interests]",
  );
  const resetButton = root.querySelector<HTMLButtonElement>(
    "[data-yumeguri-reset-state]",
  );
  const resetStatus = root.querySelector<HTMLElement>(
    "[data-yumeguri-reset-status]",
  );
  const sheet = root.querySelector<HTMLElement>("[data-yumeguri-my-sheet]");
  const sheetBackdrop = root.querySelector<HTMLElement>(
    "[data-yumeguri-my-sheet-backdrop]",
  );
  const sheetCard = root.querySelector<HTMLElement>(
    "[data-yumeguri-my-sheet-card]",
  );
  const sheetGripButton = root.querySelector<HTMLButtonElement>(
    "[data-yumeguri-my-sheet-grip]",
  );
  let activeTrigger: HTMLElement | null = null;
  let activeSpaId: string | null = null;

  const closeSheet = () => {
    sheet?.classList.remove("is-open");
    sheet?.setAttribute("aria-hidden", "true");
    sheet?.classList.remove("is-dragging");
    if (sheet) sheet.style.transform = "";
    if (sheetBackdrop) sheetBackdrop.hidden = true;
    if (activeTrigger?.isConnected) activeTrigger.focus();
    activeTrigger = null;
    activeSpaId = null;
  };

  const openSheet = (spa: Spa, trigger: HTMLElement) => {
    if (!sheet || !sheetCard) return;
    activeTrigger = trigger;
    activeSpaId = spa.id;
    sheetCard.replaceChildren(createPlaceCard(spa, { showNotes: true }));
    bindUserStateControls(sheetCard);
    refreshUserStateControls(sheetCard);
    if (sheetBackdrop) sheetBackdrop.hidden = false;
    sheet.removeAttribute("aria-hidden");
    sheet.classList.add("is-open");
    sheet.focus({ preventScroll: true });
  };

  sheetBackdrop?.addEventListener("click", closeSheet);
  bindPlaceSheetGrip({
    sheet,
    gripButton: sheetGripButton,
    closeSheet,
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet?.classList.contains("is-open")) {
      closeSheet();
    }
  });

  const render = () => {
    const loadedState = loadUserState();
    const stampedState = syncCompletionStamps(loadedState, spas);
    const state = stampedState === loadedState ? loadedState : stampedState;
    if (stampedState !== loadedState) saveUserState(stampedState);

    let visibleCityProgressCount = 0;

    rows.forEach((row) => {
      const city = row.dataset.yumeguriProgressRow ?? "all";
      const progress = calculateYumeguriProgress(spas, state, city);
      const isCityRow = city !== "all";
      const shouldShowRow = !isCityRow || progress.visitedCount > 0;
      const title = row.querySelector<HTMLElement>("[data-yumeguri-row-title]");
      const copy = row.querySelector<HTMLElement>("[data-yumeguri-row-copy]");
      const bar = row.querySelector<HTMLElement>("[data-yumeguri-row-bar]");

      if (title) {
        title.textContent = `${progress.scopeLabel} ${progress.visitedCount}/${progress.totalCount}`;
      }
      if (copy) copy.textContent = getYumeguriProgressCopy(progress);
      if (bar) bar.style.inlineSize = `${progress.percentage}%`;
      row.hidden = !shouldShowRow;
      if (isCityRow && shouldShowRow) visibleCityProgressCount += 1;
    });

    if (cityProgressSection) {
      cityProgressSection.hidden = visibleCityProgressCount === 0;
    }

    const visitedSpas = spas.filter((spa) => state.visited[spa.id]?.value);
    const interestedSpas = spas.filter(
      (spa) => state.interested[spa.id]?.value,
    );
    visitedList?.replaceChildren(
      ...visitedSpas.map((spa) => createVisitedButton(spa)),
    );
    interestedList?.replaceChildren(
      ...interestedSpas.map((spa) => createInterestedButton(spa)),
    );
    refreshUserStateControls(root);

    root
      .querySelectorAll<HTMLElement>("[data-yumeguri-saved-card]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const spa = spas.find(
            (item) => item.id === button.dataset.yumeguriSavedCard,
          );
          if (spa) openSheet(spa, button);
        });
      });

    if (emptyElement) emptyElement.hidden = visitedSpas.length > 0;
    if (emptyInterestsElement) {
      emptyInterestsElement.hidden = interestedSpas.length > 0;
    }
    if (resetButton) {
      const hasSavedRecords =
        visitedSpas.length > 0 ||
        interestedSpas.length > 0 ||
        Object.keys(state.stamps).length > 0 ||
        Boolean(state.lastFilters) ||
        Boolean(state.ui) ||
        hasStoredUserState();
      resetButton.disabled = !hasSavedRecords;
      resetButton.setAttribute("aria-disabled", String(!hasSavedRecords));
    }

    const activeSpaHasSavedState =
      activeSpaId !== null &&
      (state.visited[activeSpaId]?.value === true ||
        state.interested[activeSpaId]?.value === true);
    if (
      sheet?.classList.contains("is-open") &&
      activeSpaId !== null &&
      !activeSpaHasSavedState
    ) {
      closeSheet();
    }
  };

  resetButton?.addEventListener("click", () => {
    const shouldReset = window.confirm(
      "この端末に保存した行った施設、気になる施設、スタンプ、進捗を削除します。よろしいですか？",
    );
    if (!shouldReset) return;

    const didClear = clearUserState();
    if (resetStatus) {
      resetStatus.textContent = didClear
        ? "この端末の記録を削除しました。"
        : "記録を削除できませんでした。ブラウザのサイトデータ削除もお試しください。";
    }
    if (didClear) {
      closeSheet();
      render();
      window.dispatchEvent(
        new CustomEvent("yumeguri:user-state-change", {
          detail: { action: "reset" },
        }),
      );
    }
  });

  window.addEventListener("storage", render);
  window.addEventListener("yumeguri:user-state-change", render);
  render();
};

document.addEventListener("astro:page-load", initMyPage);
initMyPage();
