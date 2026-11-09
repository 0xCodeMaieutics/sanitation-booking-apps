import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { appendFileSync, readFileSync, writeFileSync } from "node:fs"
import { join, matchesGlob } from "node:path"
import { parseArgs } from "node:util"

// Usage: node scripts/risk-tier.mts [base] [--markdown <file>] [--pr-url <url>]
// Classifies the files changed since `base` (default origin/main) into Risk Tiers.
// With --pr-url, each file in the markdown links to its diff in the pull request.

type Tier = "high" | "medium" | "low"
type Rule = { tier: Tier; reason: string; patterns: string[]; exclude?: string[] }
type ChangedFile = { paths: string[]; added: number; deleted: number }
type Classified = ChangedFile & { tier: Tier; reason: string | null }

const RULES_FILE = ".github/risk-tiers.json"
const COLLAPSE_AFTER = 10
// High wins over everything, and Low rules must beat the Medium catch-all.
const RULE_ORDER: Tier[] = ["high", "low", "medium"]
const RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2 }
const DISPLAY: Record<Tier, { icon: string; label: string; guidance: string }> = {
  high: {
    icon: "🔴",
    label: "High",
    guidance:
      "Careful review: read every line, consider production impact and rollback, test by hand. Get another person's approval before merging.",
  },
  medium: {
    icon: "🟡",
    label: "Medium",
    guidance: "Normal review: read the diff and check the behaviour in a preview.",
  },
  low: { icon: "🟢", label: "Low", guidance: "Skim and approve once CI passes." },
}

const root = join(import.meta.dirname, "..")
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { markdown: { type: "string" }, "pr-url": { type: "string" } },
})
const base = positionals[0] ?? "origin/main"

const { rules } = JSON.parse(readFileSync(join(root, RULES_FILE), "utf8")) as { rules: Rule[] }
const orderedRules = RULE_ORDER.flatMap((tier) => rules.filter((rule) => rule.tier === tier))

const files = readChangedFiles(base).map(classify)
const tier = files.reduce<Tier>((max, file) => (RANK[file.tier] > RANK[max] ? file.tier : max), "low")

const summary = `Risk Tier: ${DISPLAY[tier].label} (${fileCount(files.length)}, ${countUnclassified(files)} unclassified)`
console.log(summary)
for (const file of files) {
  console.log(
    `  ${file.tier.padEnd(6)} ${file.paths.join(" -> ")}${file.reason !== null ? "" : " (unclassified)"}`
  )
}

if (values.markdown !== undefined && values.markdown !== "")
  writeFileSync(values.markdown, renderMarkdown(tier, files))
if (process.env.GITHUB_OUTPUT !== undefined && process.env.GITHUB_OUTPUT !== "")
  appendFileSync(process.env.GITHUB_OUTPUT, `tier=${tier}\n`)

function readChangedFiles(baseRef: string): ChangedFile[] {
  const output = execFileSync("git", ["diff", "--numstat", "-M", "-z", `${baseRef}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  })
  const tokens = output.split("\0")
  const changed: ChangedFile[] = []
  for (let i = 0; i < tokens.length; i++) {
    if ((tokens[i] ?? "") === "") continue
    const [added, deleted, path] = tokens[i].split("\t")
    // A rename leaves the path empty and puts the old and new paths in the next two tokens.
    const paths = path !== undefined && path !== "" ? [path] : [tokens[++i], tokens[++i]]
    // Binary files report "-" instead of line counts.
    changed.push({ paths, added: Number(added) || 0, deleted: Number(deleted) || 0 })
  }
  return changed
}

function classify(file: ChangedFile): Classified {
  const matches = file.paths.map((path) => orderedRules.find((rule) => ruleMatches(rule, path)))
  const highest = matches.reduce<Rule | undefined>(
    (max, rule) =>
      rule !== undefined && (max === undefined || RANK[rule.tier] > RANK[max.tier]) ? rule : max,
    undefined
  )
  return { ...file, tier: highest?.tier ?? "medium", reason: highest?.reason ?? null }
}

function ruleMatches(rule: Rule, path: string) {
  const matches = (pattern: string) => matchesGlob(path, pattern)
  return rule.patterns.some(matches) && !rule.exclude?.some(matches)
}

function fileCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`
}

function countUnclassified(classified: Classified[]) {
  return classified.filter((file) => file.reason === null).length
}

function renderMarkdown(prTier: Tier, classified: Classified[]) {
  const added = classified.reduce((sum, file) => sum + file.added, 0)
  const deleted = classified.reduce((sum, file) => sum + file.deleted, 0)
  const unclassified = classified.filter((file) => file.reason === null)

  const sections = (["high", "medium", "low"] as const).map((sectionTier) =>
    renderSection(
      `${DISPLAY[sectionTier].icon} ${DISPLAY[sectionTier].label}`,
      classified.filter((file) => file.reason !== null && file.tier === sectionTier)
    )
  )
  sections.splice(
    2,
    0,
    renderSection(
      "⚪ Unclassified",
      unclassified,
      `counted as Medium. Add a rule for it in \`${RULES_FILE}\`.`
    )
  )

  return [
    "<!-- risk-tier -->",
    `## Risk Tier: ${DISPLAY[prTier].icon} ${DISPLAY[prTier].label}`,
    DISPLAY[prTier].guidance,
    "",
    `${fileCount(classified.length)} changed (+${added} / −${deleted}) · ${unclassified.length} unclassified`,
    ...sections.filter(Boolean),
  ].join("\n")
}

function renderSection(title: string, sectionFiles: Classified[], note?: string) {
  if (sectionFiles.length === 0) return ""
  const list = sectionFiles
    .map((file) => {
      const oldPaths = file.paths.slice(0, -1).map((p) => `\`${p}\` → `)
      const path = oldPaths.join("") + linkToDiff(file.paths.at(-1)!)
      return file.reason !== null ? `- ${path} (${file.reason})` : `- ${path}`
    })
    .join("\n")
  const body =
    sectionFiles.length > COLLAPSE_AFTER
      ? `<details><summary>Show files</summary>\n\n${list}\n\n</details>`
      : list
  return `\n### ${title} (${sectionFiles.length})${note !== undefined ? `, ${note}` : ""}\n${body}`
}

// GitHub anchors each file in a pull request's diff by the SHA-256 of its (new) path.
function linkToDiff(path: string) {
  if (values["pr-url"] === undefined || values["pr-url"] === "") return `\`${path}\``
  const anchor = createHash("sha256").update(path).digest("hex")
  return `[\`${path}\`](${values["pr-url"]}/files#diff-${anchor})`
}
