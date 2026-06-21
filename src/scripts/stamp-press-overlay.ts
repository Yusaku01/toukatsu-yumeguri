type StampPressEventDetail = {
  spaId: string;
  spaName: string;
  visitedAt?: string;
  mainText?: string;
  subText?: string;
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

const updateStampText = (
  stamp: HTMLElement,
  {
    spaId,
    mainText = "湯巡り済み",
    subText = "東葛湯巡り",
    visitedAt,
  }: StampPressEventDetail,
) => {
  const dateText = formatStampDate(visitedAt);
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

  stamp.dataset.spaId = spaId;
  stamp.dataset.stampMain = mainText;
  stamp.dataset.stampSub = subText;
  stamp.hidden = false;
  stamp.setAttribute("aria-hidden", "true");

  if (svg) svg.setAttribute("aria-label", `${mainText}スタンプ`);
  if (mainElement) mainElement.textContent = mainText;
  if (subElement) subElement.textContent = subText;
  if (dateElement) dateElement.textContent = dateText;
};

const initStampPressOverlay = () => {
  const overlay = document.querySelector<HTMLElement>(
    "[data-yumeguri-stamp-overlay]",
  );
  const stamp = overlay?.querySelector<HTMLElement>("[data-yumeguri-stamp]");
  const liveRegion = document.querySelector<HTMLElement>(
    "[data-yumeguri-stamp-live]",
  );

  if (!overlay || !stamp || overlay.dataset.ready === "true") return;
  overlay.dataset.ready = "true";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let closeTimer: number | undefined;
  let hideTimer: number | undefined;
  let previousFocus: HTMLElement | null = null;

  const hideOverlay = () => {
    overlay.classList.remove("is-active");
    overlay.classList.remove("is-review");
    stamp.classList.remove("is-pressing");
    stamp.classList.remove("is-reviewing");
    overlay.setAttribute("aria-hidden", "true");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(
      () => {
        overlay.hidden = true;
      },
      prefersReducedMotion.matches ? 120 : 240,
    );
  };

  const closeReviewOverlay = () => {
    hideOverlay();
    previousFocus?.focus({ preventScroll: true });
    previousFocus = null;
  };

  window.addEventListener("yumeguri:stamp-press", (event) => {
    const detail = (event as CustomEvent<StampPressEventDetail>).detail;
    if (!detail?.spaId) return;

    window.clearTimeout(closeTimer);
    window.clearTimeout(hideTimer);

    updateStampText(stamp, detail);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-active");
    overlay.classList.remove("is-review");
    stamp.classList.remove("is-pressing");
    stamp.classList.remove("is-reviewing");

    if (liveRegion) {
      liveRegion.textContent = `${detail.spaName || "この施設"}を訪問済みにしました`;
    }

    requestAnimationFrame(() => {
      overlay.classList.add("is-active");
      stamp.classList.add("is-pressing");
    });

    closeTimer = window.setTimeout(
      hideOverlay,
      prefersReducedMotion.matches ? 520 : 1500,
    );
  });

  window.addEventListener("yumeguri:stamp-review", (event) => {
    const detail = (event as CustomEvent<StampPressEventDetail>).detail;
    if (!detail?.spaId) return;

    window.clearTimeout(closeTimer);
    window.clearTimeout(hideTimer);

    previousFocus = document.activeElement as HTMLElement | null;
    updateStampText(stamp, detail);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.remove("is-active", "is-review");
    stamp.classList.remove("is-pressing", "is-reviewing");

    if (liveRegion) {
      liveRegion.textContent = `${detail.spaName || "この施設"}の獲得スタンプを表示しました`;
    }

    requestAnimationFrame(() => {
      overlay.classList.add("is-active", "is-review");
      stamp.classList.add("is-reviewing");
      overlay.focus({ preventScroll: true });
    });
  });

  overlay.addEventListener("click", (event) => {
    if (!overlay.classList.contains("is-review")) return;
    if (event.target !== overlay) return;
    closeReviewOverlay();
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !overlay.classList.contains("is-review")) {
      return;
    }
    event.preventDefault();
    closeReviewOverlay();
  });
};

document.addEventListener("astro:page-load", initStampPressOverlay);
initStampPressOverlay();
