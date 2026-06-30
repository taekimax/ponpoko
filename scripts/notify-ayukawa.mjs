import { spawnSync } from "node:child_process";

const message = process.argv.slice(2).join(" ") || "폰포코 배포 완료: https://taekimax.github.io/ponpoko/";
const candidates = [
  { command: "hermes", args: ["agent", "ayukawa", "dm", message] },
  { command: "hermes", args: ["ayukawa", "dm", message] },
  { command: "ayukawa", args: ["dm", message] }
];

for (const candidate of candidates) {
  if (!commandExists(candidate.command)) {
    continue;
  }

  const result = spawnSync(candidate.command, candidate.args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status === 0) {
    console.log(`sent via ${candidate.command}`);
    process.exit(0);
  }

  console.error(`${candidate.command} failed: ${strip(result.stderr || result.stdout)}`);
}

console.error("Hermes ayukawa command not found or failed.");
process.exit(1);

function commandExists(command) {
  return spawnSync("zsh", ["-lc", `command -v ${quote(command)}`], {
    stdio: "ignore"
  }).status === 0;
}

function quote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function strip(value) {
  return value.replace(/[A-Za-z0-9_=-]{20,}/g, "[redacted]").trim();
}
