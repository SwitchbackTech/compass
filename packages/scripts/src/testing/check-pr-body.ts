import { readFileSync } from "node:fs";

export const REQUIRED_PR_SECTIONS = [
  "Automated validation",
  "Independent review",
  "Test plan",
] as const;

export const MIN_SECTION_CHARS = 12;

const TASK_BOX = /^\s*[-*]\s+\[[ xX]\]/m;

export function checkPrBody(body: string | null | undefined): string[] {
  if (body == null || body.trim().length === 0) {
    return ["PR body is empty or unreadable (fail closed)"];
  }

  const sections = splitMarkdownSections(body);
  const issues: string[] = [];

  for (const heading of REQUIRED_PR_SECTIONS) {
    const raw = sections.get(heading);
    if (raw == null) {
      issues.push(`missing ## ${heading}`);
      continue;
    }
    if (TASK_BOX.test(raw)) {
      issues.push(`## ${heading}: task boxes are not evidence`);
    }
    const visible = visibleSectionText(raw);
    if (visible.length < MIN_SECTION_CHARS) {
      issues.push(
        `## ${heading}: needs executed evidence (found ${visible.length} visible characters; minimum ${MIN_SECTION_CHARS})`,
      );
    }
  }

  return issues;
}

export function visibleSectionText(raw: string): string {
  return stripHtmlComments(raw).replace(/\s+/g, " ").trim();
}

function stripHtmlComments(text: string): string {
  let result = "";
  let remaining = text;
  while (remaining.length > 0) {
    const start = remaining.indexOf("<!--");
    if (start === -1) {
      result += remaining;
      break;
    }
    result += remaining.slice(0, start);
    const end = remaining.indexOf("-->", start + 4);
    if (end === -1) {
      break;
    }
    remaining = remaining.slice(end + 3);
  }
  return result;
}

export function splitMarkdownSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const heading = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(heading)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match == null || match.index == null) continue;
    const title = match[1]?.trim() ?? "";
    const start = match.index + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    sections.set(title, body.slice(start, end));
  }
  return sections;
}

function readBodyFromCli(): string | null {
  if (process.env["PR_BODY"] != null) return process.env["PR_BODY"];
  const path = process.argv[2];
  if (path) return readFileSync(path, "utf8");
  return null;
}

if (import.meta.main) {
  const issues = checkPrBody(readBodyFromCli());
  if (issues.length > 0) {
    console.error("PR body is incomplete:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }
}
