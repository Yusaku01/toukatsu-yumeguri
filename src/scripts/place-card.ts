import { getSpaTagGroups } from "../lib/tag-groups";
import type { Spa } from "../lib/types";
import { createStampMark } from "./stamp-mark";

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

const appendStateButton = (
  parent: HTMLElement,
  spa: Spa,
  action: "visited" | "interested",
  iconClass: string,
  label: string,
) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "prototype-memory-action",
    `prototype-memory-action--${action}`,
  ].join(" ");
  button.dataset.yumeguriAction = action;
  button.dataset.spaId = spa.id;
  button.dataset.spaName = spa.name;
  button.setAttribute("aria-pressed", "false");
  appendIcon(button, iconClass);
  appendText(button, "span", label).dataset.yumeguriActionLabel = "";
  parent.append(button);
  return button;
};

type CreatePlaceCardOptions = {
  showNotes?: boolean;
};

export const createPlaceCard = (
  spa: Spa,
  { showNotes = false }: CreatePlaceCardOptions = {},
) => {
  const card = document.createElement("article");
  card.className = "prototype-selected-card";

  const body = document.createElement("div");
  body.className = "prototype-place-body";

  const title = document.createElement("h2");
  title.className = "prototype-place-title prototype-title-with-stamp";
  appendText(title, "span", spa.name);
  title.append(createStampMark({ spaId: spa.id, position: "title" }));
  body.append(title);

  if (showNotes && spa.notes) {
    const note = document.createElement("p");
    note.className = "prototype-place-note";
    note.textContent = spa.notes;
    body.append(note);
  }

  const memoryActions = document.createElement("div");
  memoryActions.className = "prototype-memory-actions";
  memoryActions.setAttribute("aria-label", `${spa.name}の訪問メモ`);
  appendStateButton(
    memoryActions,
    spa,
    "visited",
    "prototype-icon--check",
    "行った",
  );
  appendStateButton(
    memoryActions,
    spa,
    "interested",
    "prototype-icon--bookmark",
    "気になる",
  );
  body.append(memoryActions);

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
    const transportRow = document.createElement("div");
    transportRow.className = "prototype-place-detail-row";
    appendText(
      transportRow,
      "span",
      "アクセス",
      "prototype-place-detail-label",
    );
    const transportDetail = document.createElement("p");
    transportDetail.className = "prototype-place-detail";
    appendIcon(transportDetail, "prototype-icon--bus");
    appendText(transportDetail, "span", transport);
    transportRow.append(transportDetail);
    detailList.append(transportRow);
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
