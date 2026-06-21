import {
  loadUserState,
  saveUserState,
  setSpaInterested,
  setSpaVisited,
  USER_STATE_STORAGE_KEY,
  type YumeguriUserState,
} from "../lib/user-state";

type YumeguriAction = "visited" | "interested";

const actionLabels = {
  visited: {
    active: "行った",
    inactive: "行った",
    add: "行った施設に登録",
    remove: "行った施設から外す",
  },
  interested: {
    active: "気になる",
    inactive: "気になる",
    add: "気になる施設に登録",
    remove: "気になる施設から外す",
  },
} as const satisfies Record<
  YumeguriAction,
  { active: string; inactive: string; add: string; remove: string }
>;

const isYumeguriAction = (value: string | undefined): value is YumeguriAction =>
  value === "visited" || value === "interested";

const getActionState = (
  state: YumeguriUserState,
  action: YumeguriAction,
  spaId: string,
): boolean => {
  if (action === "visited") {
    return state.visited[spaId]?.value === true;
  }

  return state.interested[spaId]?.value === true;
};

const formatStampDate = (dateValue: string | undefined): string => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
};

const updateStampMark = (stamp: HTMLElement, state: YumeguriUserState) => {
  const spaId = stamp.dataset.spaId;
  if (!spaId) return;

  const visitedEntry = state.visited[spaId];
  const isVisited = visitedEntry?.value === true;
  stamp.hidden = !isVisited;
  stamp.setAttribute("aria-hidden", String(!isVisited));

  const mainText = stamp.dataset.stampMain ?? "湯巡り済み";
  const subText = stamp.dataset.stampSub ?? "東葛湯巡り";
  const dateText = formatStampDate(visitedEntry?.visitedAt);
  const svg = stamp.querySelector<SVGElement>(".prototype-stamp-svg");
  const mainElement = stamp.querySelector<SVGTextElement>(
    "[data-yumeguri-stamp-main]",
  );
  const subElement = stamp.querySelector<SVGTextElement>(
    "[data-yumeguri-stamp-sub]",
  );
  const dateElement = stamp.querySelector<SVGTextElement>(
    "[data-yumeguri-stamp-date]",
  );

  if (svg) svg.setAttribute("aria-label", `${mainText}スタンプ`);
  if (stamp.dataset.yumeguriStampReview !== undefined) {
    const dateLabel = dateText ? `${dateText}の` : "";
    stamp.setAttribute(
      "aria-label",
      `${dateLabel}${mainText}スタンプを拡大表示`,
    );
  }
  if (mainElement) mainElement.textContent = mainText;
  if (subElement) subElement.textContent = subText;
  if (dateElement) dateElement.textContent = dateText;
};

const updateActionButton = (
  button: HTMLButtonElement,
  state: YumeguriUserState,
) => {
  const action = button.dataset.yumeguriAction;
  const spaId = button.dataset.spaId;
  if (!isYumeguriAction(action) || !spaId) return;

  const isActive = getActionState(state, action, spaId);
  const labels = actionLabels[action];
  const spaName = button.dataset.spaName ?? "この施設";
  const labelElement = button.querySelector<HTMLElement>(
    "[data-yumeguri-action-label]",
  );

  button.setAttribute("aria-pressed", String(isActive));
  button.classList.toggle("is-active", isActive);
  button.setAttribute(
    "aria-label",
    `${spaName}を${isActive ? labels.remove : labels.add}`,
  );

  if (labelElement) {
    labelElement.textContent = isActive ? labels.active : labels.inactive;
  }
};

export const refreshUserStateControls = (root: ParentNode = document) => {
  const state = loadUserState();

  root
    .querySelectorAll<HTMLButtonElement>("[data-yumeguri-action][data-spa-id]")
    .forEach((button) => updateActionButton(button, state));

  root
    .querySelectorAll<HTMLElement>("[data-yumeguri-stamp][data-spa-id]")
    .forEach((stamp) => updateStampMark(stamp, state));
};

export const bindUserStateControls = (root: HTMLElement) => {
  if (root.dataset.yumeguriControlsReady === "true") {
    refreshUserStateControls(root);
    return;
  }

  root.dataset.yumeguriControlsReady = "true";

  root.addEventListener("click", (event) => {
    const stamp = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-yumeguri-stamp-review][data-spa-id]",
    );
    if (stamp && root.contains(stamp) && !stamp.hidden) {
      const spaId = stamp.dataset.spaId;
      if (!spaId) return;

      const currentState = loadUserState();
      const visitedEntry = currentState.visited[spaId];
      if (visitedEntry?.value !== true) return;

      window.dispatchEvent(
        new CustomEvent("yumeguri:stamp-review", {
          detail: {
            spaId,
            spaName: stamp
              .closest(".prototype-title-with-stamp")
              ?.querySelector(":scope > span:first-child")
              ?.textContent?.trim(),
            visitedAt: visitedEntry.visitedAt,
            mainText: stamp.dataset.stampMain,
            subText: stamp.dataset.stampSub,
          },
        }),
      );
      return;
    }

    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
      "button[data-yumeguri-action][data-spa-id]",
    );
    if (!button || !root.contains(button)) return;

    const action = button.dataset.yumeguriAction;
    const spaId = button.dataset.spaId;
    if (!isYumeguriAction(action) || !spaId) return;

    const currentState = loadUserState();
    const currentValue = getActionState(currentState, action, spaId);
    const nextState =
      action === "visited"
        ? setSpaVisited(currentState, spaId, !currentValue)
        : setSpaInterested(currentState, spaId, !currentValue);
    const shouldPressStamp = action === "visited" && !currentValue;

    saveUserState(nextState);
    refreshUserStateControls(root);
    if (shouldPressStamp) {
      window.dispatchEvent(
        new CustomEvent("yumeguri:stamp-press", {
          detail: {
            spaId,
            spaName: button.dataset.spaName ?? "この施設",
            visitedAt: nextState.visited[spaId]?.visitedAt,
          },
        }),
      );
    }
    window.dispatchEvent(
      new CustomEvent("yumeguri:user-state-change", {
        detail: { action, spaId, value: !currentValue },
      }),
    );
  });

  window.addEventListener("storage", (event) => {
    if (event.key === USER_STATE_STORAGE_KEY) {
      refreshUserStateControls(root);
    }
  });

  refreshUserStateControls(root);
};
