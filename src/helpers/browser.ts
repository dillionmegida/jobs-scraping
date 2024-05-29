import puppeteer, { Page } from "puppeteer"

export async function launchBrowser(
  url: string,
  cb: (page: Page) => Promise<void>
) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(url)

  await cb(page)

  await browser.close()
}
