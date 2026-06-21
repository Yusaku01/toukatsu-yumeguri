export type StampMarkOptions = {
  spaId: string;
  mainText?: string;
  subText?: string;
  dateText?: string;
  position?: "card" | "sheet" | "title" | "overlay";
  hidden?: boolean;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const createSvgElement = <K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
): SVGElementTagNameMap[K] => {
  const element = document.createElementNS(SVG_NS, tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
};

const appendSvgText = (
  parent: SVGElement,
  className: string,
  y: string,
  text: string,
  dataAttribute: string,
  fill = "currentColor",
) => {
  const textElement = createSvgElement("text", {
    class: className,
    x: "80",
    y,
    fill,
    stroke: "none",
    "text-anchor": "middle",
  });
  textElement.dataset[dataAttribute] = "";
  textElement.textContent = text;
  parent.append(textElement);
};

const appendDistressMask = (defs: SVGDefsElement, maskId: string) => {
  const mask = createSvgElement("mask", {
    id: maskId,
    maskUnits: "userSpaceOnUse",
    x: "0",
    y: "0",
    width: "160",
    height: "160",
    "mask-type": "luminance",
  });

  mask.append(
    createSvgElement("rect", { width: "160", height: "160", fill: "white" }),
  );

  const distress = createSvgElement("g", {
    fill: "black",
    stroke: "black",
    "stroke-linecap": "round",
  });

  [
    ["37", "37", "5.8", "2.8", "0.92"],
    ["56", "47", "3.4", "1.8", "0.86"],
    ["101", "38", "6.6", "2.5", "0.86"],
    ["119", "59", "4.2", "2", "0.88"],
    ["36", "83", "4.6", "2.2", "0.9"],
    ["62", "70", "3.5", "1.8", "0.8"],
    ["86", "73", "4.5", "2", "0.74"],
    ["96", "91", "6.4", "2.4", "0.9"],
    ["121", "102", "7.2", "2.8", "0.92"],
    ["42", "108", "4.8", "2.1", "0.84"],
    ["50", "119", "7.2", "2.8", "0.94"],
    ["84", "124", "3.8", "1.9", "0.86"],
    ["109", "132", "6.2", "2.7", "0.92"],
    ["130", "80", "3.2", "1.5", "0.82"],
  ].forEach(([cx, cy, rx, ry, opacity]) => {
    distress.append(
      createSvgElement("ellipse", {
        cx,
        cy,
        rx,
        ry,
        opacity,
      }),
    );
  });

  distress.append(
    createSvgElement("path", {
      d: "M28 57c12 3 22-4 34 0M91 54c18-4 28 5 41 1M37 101c22-3 36 5 54 1M65 112c18-5 35 3 51-1",
      fill: "none",
      "stroke-width": "3.4",
      opacity: "0.66",
    }),
    createSvgElement("path", {
      d: "M27 134c22 5 39-6 59-1M80 30c22 5 35-4 51 1M45 78c17 4 35-4 52 0",
      fill: "none",
      "stroke-width": "2.4",
      opacity: "0.68",
    }),
  );

  mask.append(distress);
  defs.append(mask);
};

export const createStampMark = ({
  spaId,
  mainText = "湯巡り済み",
  subText = "東葛湯巡り",
  dateText = "",
  position = "sheet",
  hidden = true,
}: StampMarkOptions): HTMLElement => {
  const isReviewTrigger = position === "title";
  const root = document.createElement(isReviewTrigger ? "button" : "span");
  root.className = `prototype-stamp-mark prototype-stamp-mark--${position}`;
  root.dataset.yumeguriStamp = "";
  root.dataset.spaId = spaId;
  root.dataset.stampMain = mainText;
  root.dataset.stampSub = subText;
  root.dataset.stampPosition = position;
  root.setAttribute("aria-hidden", String(hidden));
  root.hidden = hidden;
  if (isReviewTrigger) {
    root.dataset.yumeguriStampReview = "";
    root.setAttribute("type", "button");
    root.setAttribute("aria-label", `${mainText}スタンプを拡大表示`);
  }

  const steam = createSvgElement("svg", {
    class: "prototype-stamp-steam",
    viewBox: "0 0 80 90",
    "aria-hidden": "true",
  });
  steam.append(
    createSvgElement("path", {
      d: "M24 80c20-16-10-22 6-40 8-9 4-17-2-26",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "7",
      "stroke-linecap": "round",
    }),
    createSvgElement("path", {
      d: "M48 82c16-15-6-24 8-40 7-8 3-15-3-25",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "6",
      "stroke-linecap": "round",
    }),
  );

  const stampSvg = createSvgElement("svg", {
    class: "prototype-stamp-svg",
    viewBox: "0 0 160 160",
    role: "img",
    "aria-label": `${mainText}スタンプ`,
  });
  const defs = createSvgElement("defs");
  const roughenId = `stamp-roughen-${spaId}-${position}`;
  const distressId = `stamp-distress-${spaId}-${position}`;
  const filter = createSvgElement("filter", {
    id: roughenId,
    x: "-12%",
    y: "-12%",
    width: "124%",
    height: "124%",
  });
  filter.append(
    createSvgElement("feTurbulence", {
      type: "fractalNoise",
      baseFrequency: "0.064",
      numOctaves: "4",
      seed: "7",
      result: "noise",
    }),
    createSvgElement("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "noise",
      scale: "2.25",
      xChannelSelector: "R",
      yChannelSelector: "G",
    }),
  );
  defs.append(filter);
  appendDistressMask(defs, distressId);

  const ink = createSvgElement("g", {
    class: "prototype-stamp-ink",
    fill: "none",
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    filter: `url(#${roughenId})`,
    mask: `url(#${distressId})`,
  });
  ink.append(
    createSvgElement("circle", {
      cx: "80",
      cy: "80",
      r: "71",
      "stroke-width": "6.5",
    }),
    createSvgElement("circle", {
      cx: "80",
      cy: "80",
      r: "61",
      "stroke-width": "2.4",
      opacity: "0.76",
    }),
    createSvgElement("circle", {
      class: "prototype-stamp-fill",
      cx: "80",
      cy: "80",
      r: "56",
      fill: "currentColor",
      stroke: "none",
    }),
  );

  ink.append(
    createSvgElement("image", {
      class: "prototype-stamp-watermark",
      href: "/stamp-watermark.svg",
      x: "48",
      y: "35",
      width: "64",
      height: "79",
      opacity: "0.28",
      preserveAspectRatio: "xMidYMid meet",
    }),
  );
  appendSvgText(
    ink,
    "prototype-stamp-date",
    "63",
    dateText,
    "yumeguriStampDate",
    "#fffaf4",
  );
  appendSvgText(
    ink,
    "prototype-stamp-main",
    "92",
    mainText,
    "yumeguriStampMain",
    "#fffaf4",
  );
  appendSvgText(
    ink,
    "prototype-stamp-sub",
    "113",
    subText,
    "yumeguriStampSub",
    "#fffaf4",
  );

  stampSvg.append(defs, ink);
  root.append(steam, stampSvg);
  return root;
};
