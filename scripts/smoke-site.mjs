// Browser checks against a running build, local or deployed.
//   node scripts/smoke-site.mjs http://localhost:3218
//   node scripts/smoke-site.mjs https://your-preview.vercel.app --public
// --public also requires that no address in the page metadata points at localhost.
// Uses the Edge or Chrome already installed. Exits non-zero on any failure.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const base = (process.argv[2] ?? "http://localhost:3218").replace(/\/$/, "");
const isPublic = process.argv.includes("--public");
const BROWSER = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].find((p) => p && fs.existsSync(p));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true });
try {
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(String(e).slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && problems.push(m.text().slice(0, 160)));
  await page.setViewport({ width: 1280, height: 900 });

  // Home: status, headers, hydration.
  const home = await page.goto(base + "/", { waitUntil: "networkidle0" });
  const headers = home.headers();
  check("home responds 200", home.status() === 200, String(home.status()));
  const csp = headers["content-security-policy"] ?? "";
  check("content security policy is served", csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'"));
  check("no sniffing and no framing headers", headers["x-content-type-options"] === "nosniff" && headers["x-frame-options"] === "DENY");
  check("framework is not advertised", !("x-powered-by" in headers));

  const titleOf = () => page.$eval("[aria-live] p", (e) => e.textContent);
  const first = await titleOf();

  // Choosing a vehicle changes the page in place and the address.
  await page.click('[aria-label^="Exit 2,"]');
  await page.waitForFunction((t) => document.querySelector("[aria-live] p").textContent !== t, {}, first);
  check("choosing a vehicle updates the sign", (await titleOf()) !== first, await titleOf());
  check("the address carries the vehicle", page.url().includes("v=ford-f150"), page.url());
  const pressed = await page.$$eval('[role="group"] [aria-pressed="true"]', (els) => els.length);
  check("exactly one vehicle is marked as chosen", pressed === 1, String(pressed));

  // The keyboard alone can choose a vehicle.
  await page.focus('[aria-label^="Exit 3,"]');
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.search.includes("ford-bronco"));
  check("a vehicle can be chosen from the keyboard", page.url().includes("v=ford-bronco"));

  // A link carries the vehicle; an unknown vehicle falls back without an error.
  await page.goto(base + "/?v=porsche-911", { waitUntil: "networkidle0" });
  check("a link opens on its vehicle", (await titleOf()).includes("Porsche"), await titleOf());
  await page.goto(base + "/?v=<script>alert(1)</script>", { waitUntil: "networkidle0" });
  check("an unknown vehicle in the address is ignored", (await titleOf()) === first, await titleOf());

  // From the road's exit lane into a notice, and back.
  await page.goto(base + "/?v=ford-f150", { waitUntil: "networkidle0" });
  const exit = await page.$('[role="group"][aria-label*="notices"] a');
  check("the exit lane holds links", exit !== null);
  if (exit) {
    const href = await exit.evaluate((a) => a.getAttribute("href"));
    await Promise.all([page.waitForFunction((h) => location.pathname + location.search === h, {}, href), exit.click()]);
    await page.waitForSelector("article h1");
    check("an exit opens its notice", page.url().includes("/event/"), page.url());
    const forVehicle = await page.$$eval("h2", (els) => els.map((e) => e.textContent).find((t) => t.startsWith("For the")));
    check("the notice keeps the chosen vehicle", forVehicle?.includes("F-150") ?? false, forVehicle);
    await page.goBack({ waitUntil: "networkidle0" });
    check("back returns to the road with the vehicle kept", page.url().includes("v=ford-f150"), page.url());
  }

  // A notice opened directly: source link, and the wording boundary on the page.
  const id = await page.evaluate(async () => {
    const a = document.querySelector('a[href^="/event/"]');
    return a ? a.getAttribute("href") : null;
  });
  const notice = await page.goto(base + id, { waitUntil: "networkidle0" });
  check("a notice opens directly", notice.status() === 200, id);
  const source = await page.$eval("article a[target=_blank]", (a) => ({ href: a.href, rel: a.rel }));
  check("the source link goes to nhtsa.gov", source.href.startsWith("https://www.nhtsa.gov/"), source.href);
  check("the source link does not hand over the opener", source.rel.includes("noopener"));
  const text = await page.$eval("body", (b) => b.innerText);
  check("the page says it is not a recall check", text.includes("It is not a recall check"));
  check("the page never tells anyone to stop driving", !/\bstop driving\b/i.test(text.replace("It does not tell anyone to stop driving.", "")));

  // Missing routes answer 404.
  for (const path of ["/event/nhtsa-rcl-00V000000", "/garage/no-such-vehicle", "/nothing-here"]) {
    const res = await page.goto(base + path, { waitUntil: "networkidle0" });
    check(`${path} answers 404`, res.status() === 404, String(res.status()));
  }

  // A phone: nothing wider than the screen, and the road renders.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(base + "/", { waitUntil: "networkidle0" });
  const phone = await page.evaluate(() => ({
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    marks: document.querySelectorAll("[data-i]").length,
  }));
  check("nothing is wider than a phone screen", phone.over <= 0, `${phone.over}px`);
  check("the road renders its marks", phone.marks > 1000, String(phone.marks));
  const before = await titleOf();
  const started = Date.now();
  await page.tap('[aria-label="Next vehicle"]');
  await page.waitForFunction((t) => document.querySelector("[aria-live] p").textContent !== t, { timeout: 5000 }, before);
  check("changing vehicle on a phone takes under a second", Date.now() - started < 1000, `${Date.now() - started} ms`);

  if (isPublic) {
    const meta = await page.$$eval('meta[property^="og:"], link[rel="canonical"]', (els) => els.map((e) => e.content ?? e.href));
    check("no published address points at localhost", !meta.some((m) => /localhost|127\.0\.0\.1/.test(m ?? "")), meta.find((m) => /localhost/.test(m ?? "")) ?? "");
  }

  check("no script errors on any page visited", problems.filter((p) => !/404/.test(p)).length === 0, problems.filter((p) => !/404/.test(p)).join(" | "));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
