import { $ } from "bun";
import Bun from "bun";

async function getSum(version, type) {
  const output = await $`nix-prefetch-url --type sha256 --unpack https://github.com/zen-browser/desktop/releases/download/${version}/zen.linux-${type}.tar.bz2`
  const outputText = output.text();
  return outputText.trim();
}

async function getLatestVersion() {
  const output = await fetch("https://api.github.com/repos/zen-browser/desktop/releases/latest");
  const json = await output.json();
  return json.tag_name;
}
const latestVersion = await getLatestVersion();
let genericSum = await getSum(latestVersion, "generic");
let specificSum = await getSum(latestVersion, "specific");

let file = await Bun.file("flake.nix").text();
const versionPattern = /version = ".*"/;
const pattern = /# -- sha256 specific\n(\s*)sha256 = ".*"/;
const patternGeneric = /# -- sha256 generic\n(\s*)sha256 = ".*"/;
const whiteSpace = pattern.exec(file)[1];
const genericWhiteSpace = pattern.exec(file)[1];

file = file.replace(versionPattern, `version = "${latestVersion}"`);
file = file.replace(pattern, `# -- sha256 specific\n${whiteSpace}sha256 = "sha256:${specificSum}"`);
file = file.replace(patternGeneric, `# -- sha256 generic\n${genericWhiteSpace}sha256 = "sha256:${genericSum}"`);

console.log("Overview:", "\n", "Updated Version to:", latestVersion, "\n", "Updated Specific sha256 to:", specificSum, "\n", "Updated Generic sha256 to:", genericSum);

console.log("Writing to file...");
await Bun.write("flake.nix", file);
console.log("Commiting to git...");
await $`git commit -am "Update to ${latestVersion}"`;
await $`git push`;
console.log("Done!");
