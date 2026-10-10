const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const base = process.env.TEST_URL || "http://localhost:5173";
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    assert.equal((await page.goto(base)).status(), 200);
    await page
      .getByRole("heading", { name: "Your business, beautifully in sync." })
      .waitFor();
    await page
      .getByRole("button", { name: "Orders & customers", exact: true })
      .click();
    await page
      .getByText("Keep the next step clear.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Your business knowledge", exact: true })
      .click();
    await page
      .getByText("Give your AI the right answers.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Customer conversations", exact: true })
      .click();
    await page.getByText("How do I start?", { exact: true }).click();
    assert.equal(await page.locator("details[open]").count(), 1);
    fs.mkdirSync("test-results", { recursive: true });
    await page.screenshot({
      path: "test-results/marketing-desktop.png",
      fullPage: true,
    });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base);
      await page
        .getByRole("heading", { name: "Your business, beautifully in sync." })
        .waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `No horizontal overflow at ${width}px`);
      await page.getByLabel("Open navigation", { exact: true }).click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Request a workspace" })
        .click();
      await page.waitForURL("**/signup");
      await page.getByRole("textbox", { name: "Company name" }).waitFor();
      await page.goto(base);
      if (width === 390)
        await page.screenshot({
          path: "test-results/marketing-mobile.png",
          fullPage: true,
        });
    }
    for (const path of ["/privacy", "/terms", "/robots.txt", "/sitemap.xml"])
      assert.equal((await page.request.get(base + path)).status(), 200);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: landing page, 3 interactive preview tabs, FAQ, mobile navigation/signup, 320px/390px layout, policy pages, robots and sitemap.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
