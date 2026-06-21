type BindPlaceSheetGripOptions = {
  sheet: HTMLElement | null;
  gripButton: HTMLButtonElement | null;
  closeSheet: () => void;
  openSheet?: () => void;
};

export const bindPlaceSheetGrip = ({
  sheet,
  gripButton,
  closeSheet,
  openSheet,
}: BindPlaceSheetGripOptions) => {
  let suppressGripClick = false;

  gripButton?.addEventListener("pointerdown", (event) => {
    if (!sheet?.classList.contains("is-open")) return;

    const pointerId = event.pointerId;
    const sheetHeight = sheet.getBoundingClientRect().height;
    const dismissDistance = Math.min(110, sheetHeight * 0.38);
    const startY = event.clientY;
    let currentY = event.clientY;
    let previousY = event.clientY;
    let previousTime = event.timeStamp;
    let velocityY = 0;
    let didDrag = false;
    let didDismiss = false;

    sheet.classList.add("is-dragging");
    gripButton.setPointerCapture(pointerId);

    const stopDrag = () => {
      sheet.classList.remove("is-dragging");
      if (gripButton.hasPointerCapture(pointerId)) {
        gripButton.releasePointerCapture(pointerId);
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleCancel);
    };

    const handleMove = (moveEvent: PointerEvent) => {
      if (didDismiss) return;

      currentY = moveEvent.clientY;
      const dragY = Math.max(0, currentY - startY);
      const elapsed = Math.max(1, moveEvent.timeStamp - previousTime);
      velocityY = (currentY - previousY) / elapsed;
      previousY = currentY;
      previousTime = moveEvent.timeStamp;

      if (dragY > 4) didDrag = true;
      sheet.style.transform = `translateY(${dragY}px)`;

      if (dragY >= dismissDistance) {
        didDismiss = true;
        suppressGripClick = true;
        stopDrag();
        closeSheet();
      }
    };

    const handleEnd = () => {
      if (didDismiss) return;

      const dragY = Math.max(0, currentY - startY);
      const shouldDismiss = dragY >= dismissDistance || velocityY > 0.55;
      suppressGripClick = didDrag;
      stopDrag();

      if (shouldDismiss) {
        closeSheet();
        return;
      }

      sheet.style.transform = "";
    };

    const handleCancel = () => {
      suppressGripClick = didDrag;
      stopDrag();
      sheet.style.transform = "";
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleCancel);
  });

  gripButton?.addEventListener("click", () => {
    if (suppressGripClick) {
      suppressGripClick = false;
      return;
    }

    if (sheet?.classList.contains("is-open")) {
      closeSheet();
      return;
    }

    openSheet?.();
  });
};
