import * as cheerio from "cheerio"
import { launchBrowser } from "./browser"

export type Company = "netlify" | "adyen" | "vercel" | "microsoft"
type Job = { key: Company; path: string; domain: string }
export type JobObj = { href: string; text: string }

const CAREER_PATHS: Job[] = [
  {
    key: "netlify",
    path: "https://www.netlify.com/careers/#perfect-job",
    domain: "https://www.netlify.com",
  },
  {
    key: "adyen",
    path: "https://careers.adyen.com/vacancies",
    domain: "https://careers.adyen.com",
  },
  {
    key: "vercel",
    path: "https://vercel.com/careers",
    domain: "https://vercel.com",
  },
]

export async function getJobs() {
  const jobsObj: {
    [x in Company]: JobObj[]
  } = { netlify: [], adyen: [], vercel: [], microsoft: [] }

  for (const careerPath of CAREER_PATHS) {
    const { key, path } = careerPath

    let jobsSelector

    if (key === "netlify") jobsSelector = "th.careers-results-title a"

    if (key === "adyen") jobsSelector = "a.vacancies-list-item__link"

    if (key === "vercel") jobsSelector = "a[href^='/careers/']"

    if (jobsSelector) {
      const response = await fetch(path)
      const responseTxt = await response.text()
      const $ = cheerio.load(responseTxt)

      const jobs = $(jobsSelector)

      jobs.each(function (this: cheerio.Cheerio) {
        const jobNode = $(this)
        let href = jobNode.attr("href")

        if (!href?.startsWith("https")) href = careerPath.domain + href

        const text = jobNode.text()

        if (href) jobsObj[key].push({ href, text })
      })
    }

    const microsoftJobs = await getMicrosoftJobs()
    jobsObj["microsoft"] = microsoftJobs
  }

  return jobsObj
}

async function getMicrosoftJobs() {
  let jobs: JobObj[] = []
  const jobsPage = "https://jobs.careers.microsoft.com/global/en/search"
  const jobPathPrefix = "https://jobs.careers.microsoft.com/global/en/job/"

  await launchBrowser(jobsPage, async page => {
    const inputSelector =
      '[aria-label="Search by job title, ID, or keyword"]'
    await page.waitForSelector(inputSelector)
    await page.type(inputSelector, "Software Engineer")

    await page.click('[aria-label="Find jobs"]')

    const jobsSelector = "[aria-label^='Job item']"

    await page.waitForSelector(jobsSelector)

    jobs = await page.evaluate(
      (jobsSelector, jobPathPrefix) =>
        Array.from(document.querySelectorAll(jobsSelector), element => {
          const jobId = element.ariaLabel?.replace("Job item ", "")
          const jobTitle = element.querySelector("h2")

          return {
            text: jobTitle?.textContent ?? "",
            href: jobPathPrefix + jobId,
          }
        }),
      jobsSelector,
      jobPathPrefix
    )
  })

  return jobs
}

export function filterJobs(jobs: JobObj[], filter: string) {
  return jobs.filter(job => job.text.includes(filter))
}
