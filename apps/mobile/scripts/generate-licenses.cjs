// 오픈소스 라이선스 목록(src/features/settings/licenses.json)을 다시 뽑는다 (SCRUM-238).
// 사용: apps/mobile에서 node scripts/generate-licenses.cjs "$PWD" "$PWD/src/features/settings/licenses.json"
// package.json dependencies부터 실제 설치된 패키지를 따라가며 이름·버전·라이선스·저장소·저작자를 모은다.
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const out = process.argv[3];
const pkgJson = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
function resolve(name, fromDir) {
  let dir = fromDir;
  while (true) {
    const cands = [path.join(dir, "node_modules", name)];
    if (path.basename(dir) === "node_modules") cands.push(path.join(dir, name));
    for (const c of cands) if (fs.existsSync(path.join(c, "package.json"))) return fs.realpathSync(c);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
const seen = new Map();
function visit(name, fromDir) {
  const dir = resolve(name, fromDir);
  if (!dir) return;
  if (seen.has(dir)) return;
  const p = pkgJson(dir);
  seen.set(dir, p);
  for (const dep of Object.keys({ ...(p.dependencies || {}), ...(p.optionalDependencies || {}) })) visit(dep, dir);
}
const app = pkgJson(root);
for (const dep of Object.keys(app.dependencies || {})) visit(dep, root);
const list = [];
const byKey = new Map();
for (const p of seen.values()) {
  if (!p.name || p.name.startsWith("@onnuri/")) continue;
  let license = p.license;
  if (license && typeof license === "object") license = license.type;
  if (!license && Array.isArray(p.licenses)) license = p.licenses.map((l) => l.type).join(" OR ");
  let repo = p.repository;
  if (repo && typeof repo === "object") repo = repo.url;
  if (typeof repo === "string") repo = repo.replace(/^git\+/, "").replace(/\.git$/, "").replace(/^git:\/\//, "https://").replace(/^github:/, "https://github.com/");
  if (typeof repo === "string" && /^[\w.-]+\/[\w.-]+$/.test(repo)) repo = `https://github.com/${repo}`;
  let author = p.author;
  if (author && typeof author === "object") author = author.name;
  const key = p.name;
  if (byKey.has(key)) continue;
  byKey.set(key, true);
  list.push({ name: p.name, version: p.version, license: license || "UNKNOWN", url: repo || p.homepage || null, author: author || null });
}
list.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(out, JSON.stringify(list) + "\n");
const counts = {};
for (const l of list) counts[l.license] = (counts[l.license] || 0) + 1;
console.log(list.length, JSON.stringify(counts));
