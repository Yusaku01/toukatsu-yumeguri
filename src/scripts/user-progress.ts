import type { Spa } from "../lib/types";
import {
  calculateYumeguriProgress,
  getYumeguriProgressCopy,
  syncCompletionStamps,
} from "../lib/user-progress";
import {
  dismissMapProgressToast,
  loadUserState,
  markMapProgressToastShown,
  saveUserState,
  shouldShowMapProgressToast,
} from "../lib/user-state";

type ActiveCityResolver = () => string;
type ShowTransientProgressOptions = {
  autoDismiss?: boolean;
  onDismiss?: () => void;
};

const PROGRESS_SELECTOR = "[data-yumeguri-progress]";
const PROGRESS_REVEAL_DELAY_MS = 260;
const progressDismissTimers = new WeakMap<HTMLElement, number>();
const progressDismissCallbacks = new WeakMap<HTMLElement, () => void>();
const progressRevealTimers = new WeakMap<HTMLElement, number>();

const getProgressOpenButton = (progressRoot: HTMLElement) => {
  if (!progressRoot.id) return null;
  return progressRoot.parentElement?.querySelector<HTMLButtonElement>(
    `[data-yumeguri-progress-open][aria-controls="${progressRoot.id}"]`,
  );
};

const hideTransientProgress = (progressRoot: HTMLElement) => {
  progressRoot.classList.add("is-hidden");
  progressRoot.setAttribute("aria-hidden", "true");
  const onDismiss = progressDismissCallbacks.get(progressRoot);
  progressDismissCallbacks.delete(progressRoot);
  onDismiss?.();

  const openButton = getProgressOpenButton(progressRoot);
  if (openButton) {
    openButton.setAttribute("aria-expanded", "false");
    const currentRevealTimer = progressRevealTimers.get(progressRoot);
    if (currentRevealTimer) window.clearTimeout(currentRevealTimer);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealButton = () => {
      openButton.hidden = false;
      progressRevealTimers.delete(progressRoot);
    };

    if (prefersReducedMotion) {
      revealButton();
      return;
    }

    progressRevealTimers.set(
      progressRoot,
      window.setTimeout(revealButton, PROGRESS_REVEAL_DELAY_MS),
    );
  }
};

const showTransientProgress = (
  progressRoot: HTMLElement,
  { autoDismiss = true, onDismiss }: ShowTransientProgressOptions = {},
) => {
  const timeout = Number(progressRoot.dataset.yumeguriProgressTimeout ?? 4200);
  const currentTimer = progressDismissTimers.get(progressRoot);
  if (currentTimer) {
    window.clearTimeout(currentTimer);
    progressDismissTimers.delete(progressRoot);
  }
  if (onDismiss) {
    progressDismissCallbacks.set(progressRoot, onDismiss);
  } else {
    progressDismissCallbacks.delete(progressRoot);
  }

  progressRoot.classList.remove("is-hidden");
  progressRoot.removeAttribute("aria-hidden");
  const openButton = getProgressOpenButton(progressRoot);
  const currentRevealTimer = progressRevealTimers.get(progressRoot);
  if (currentRevealTimer) {
    window.clearTimeout(currentRevealTimer);
    progressRevealTimers.delete(progressRoot);
  }
  if (openButton) {
    openButton.hidden = true;
    openButton.setAttribute("aria-expanded", "true");
  }

  if (autoDismiss) {
    progressDismissTimers.set(
      progressRoot,
      window.setTimeout(() => hideTransientProgress(progressRoot), timeout),
    );
  }
};

const saveMapProgressToastDismissed = () => {
  saveUserState(dismissMapProgressToast(loadUserState()));
};

const refreshYumeguriProgress = (
  root: ParentNode,
  spas: Spa[],
  getActiveCity: ActiveCityResolver,
) => {
  const progressRoot = root.querySelector<HTMLElement>(PROGRESS_SELECTOR);
  if (!progressRoot) return;

  const loadedState = loadUserState();
  const stampedState = syncCompletionStamps(loadedState, spas);
  const state = stampedState === loadedState ? loadedState : stampedState;
  if (stampedState !== loadedState) saveUserState(stampedState);

  const progress = calculateYumeguriProgress(spas, state, getActiveCity());
  const titleElement = progressRoot.querySelector<HTMLElement>(
    "[data-yumeguri-progress-title]",
  );
  const copyElement = progressRoot.querySelector<HTMLElement>(
    "[data-yumeguri-progress-copy]",
  );
  const barElement = progressRoot.querySelector<HTMLElement>(
    "[data-yumeguri-progress-bar]",
  );
  const meterElement = progressRoot.querySelector<HTMLElement>(
    "[data-yumeguri-progress-meter]",
  );
  const title = `${progress.scopeLabel} ${progress.visitedCount}/${progress.totalCount}`;
  const copy = getYumeguriProgressCopy(progress);

  if (titleElement) titleElement.textContent = title;
  if (copyElement) copyElement.textContent = copy;
  if (barElement) barElement.style.inlineSize = `${progress.percentage}%`;
  if (meterElement) {
    meterElement.setAttribute("aria-valuemax", String(progress.totalCount));
    meterElement.setAttribute("aria-valuenow", String(progress.visitedCount));
    meterElement.setAttribute("aria-valuetext", title);
  }
  if (progressRoot.dataset.yumeguriProgressMode === "toast") {
    if (shouldShowMapProgressToast(state)) {
      saveUserState(markMapProgressToastShown(state));
      showTransientProgress(progressRoot, {
        onDismiss: saveMapProgressToastDismissed,
      });
    } else {
      hideTransientProgress(progressRoot);
    }
  }
};

export const bindYumeguriProgress = (
  root: HTMLElement,
  spas: Spa[],
  getActiveCity: ActiveCityResolver,
) => {
  const refresh = () => refreshYumeguriProgress(root, spas, getActiveCity);

  if (root.dataset.yumeguriProgressReady === "true") {
    refresh();
    return refresh;
  }

  root.dataset.yumeguriProgressReady = "true";
  root.addEventListener("click", (event) => {
    const openButton = (
      event.target as Element | null
    )?.closest<HTMLButtonElement>("[data-yumeguri-progress-open]");
    if (openButton && root.contains(openButton)) {
      const controls = openButton.getAttribute("aria-controls");
      const progressRoot = controls
        ? root.querySelector<HTMLElement>(`#${controls}`)
        : null;
      if (progressRoot) {
        showTransientProgress(progressRoot, {
          autoDismiss: false,
          onDismiss: saveMapProgressToastDismissed,
        });
      }
      return;
    }

    const dismissButton = (
      event.target as Element | null
    )?.closest<HTMLButtonElement>("[data-yumeguri-progress-dismiss]");
    if (!dismissButton || !root.contains(dismissButton)) return;

    const progressRoot = dismissButton.closest<HTMLElement>(PROGRESS_SELECTOR);
    if (!progressRoot) return;

    const currentTimer = progressDismissTimers.get(progressRoot);
    if (currentTimer) window.clearTimeout(currentTimer);
    hideTransientProgress(progressRoot);
  });
  window.addEventListener("storage", refresh);
  window.addEventListener("yumeguri:user-state-change", refresh);
  refresh();

  return refresh;
};
