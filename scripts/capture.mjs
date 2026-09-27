// Captures for design review, using the Edge already on this machine.
//   node scripts/capture.mjs [baseUrl]
// Writes to .impeccable/review/. Motion is reduced so nothing is caught mid-animation.
// Very tall pages corrupt when captured in one piece at 2x, so whole-page
// captures are taken at 1x and the home page is also cut into legible slices.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const base = process.argv[2] ?? "http://localhost:3217";
const eventPath = process.env.EVENT_PATH ?? "/garage";
const out = path.join(process.cwd(), ".impeccable", "review");
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith(".png")) fs.rmSync(path.join(out, f));

const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => fs.existsSync(p));

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SLICE = 1800; // CSS pixels per slice

const pages = [
  { name: "desktop", url: "/", view: DESKTOP, first: true, slices: true },
  { name: "mobile", url: "/", view: MOBILE, first: true, slices: true },
  { name: "event-desktop", url: eventPath, view: DESKTOP },
  { name: "event-mobile", url: eventPath, view: MOBILE, slices: true },
  { name: "method-desktop", url: "/method", view: DESKTOP },
  { name: "garage-desktop", url: "/garage", view: DESKTOP },
  { name: "garage-vehicle-desktop", url: "/garage/subaru-outback", view: DESKTOP },
];

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });

async function open(url, view, scale) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ ...view, deviceScaleFactor: scale, isMobile: view.width < 600 });
  await page.goto(base + url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // Hide the framework's development badge; it is not part of the page.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  return page;
}

try {
  for (const p of pages) {
    const whole = await open(p.url, p.view, 1);
    const size = await whole.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    await whole.screenshot({ path: path.join(out, `${p.name}.png`), fullPage: true });
    console.log(`${p.name}.png ${p.view.width} x ${size.height}${size.overflow > 0 ? `  HORIZONTAL OVERFLOW ${size.overflow}px` : ""}`);
    await whole.close();

    if (!p.first && !p.slices) continue;
    const scale = p.view.width < 600 ? 2 : 1;
    const page = await open(p.url, p.view, scale);
    if (p.first) {
      await page.screenshot({ path: path.join(out, `${p.name}-first.png`) });
      console.log(`${p.name}-first.png ${p.view.width} x ${p.view.height}`);
    }
    if (p.slices) {
      let n = 0;
      for (let y = 0; y < size.height; y += SLICE) {
        n++;
        const height = Math.min(SLICE, size.height - y);
        const file = `${p.name}-slice-${String(n).padStart(2, "0")}.png`;
        await page.screenshot({
          path: path.join(out, file),
          clip: { x: 0, y, width: p.view.width, height },
          captureBeyondViewport: true,
        });
      }
      console.log(`${p.name}: ${n} slices of up to ${SLICE}px`);
    }
    await page.close();
  }
  const og = await open("/og", { width: 1200, height: 630 }, 1);
  await og.screenshot({ path: path.join(out, "og.png") });
  await og.close();
  console.log("og.png 1200 x 630");
} finally {
  await browser.close();
}
