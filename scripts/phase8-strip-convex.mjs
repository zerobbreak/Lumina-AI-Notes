import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function transform(content, filePath) {
  let next = content;

  // Shared utilities path
  next = next.replace(/@\/convex\/shared\//g, "@/lib/shared/");
  next = next.replace(/from "@\/convex\/_generated\/dataModel"/g, 'from "@/types/data-model"');
  next = next.replace(/from '@\/convex\/_generated\/dataModel'/g, "from '@/types/data-model'");

  const isQueryOrMutation =
    filePath.includes(`${path.sep}lib${path.sep}queries${path.sep}`) ||
    filePath.includes(`${path.sep}lib${path.sep}mutations${path.sep}`);

  if (isQueryOrMutation) {
    next = next.replace(/import \{ isRestApiEnabled \} from "@\/lib\/api\/enabled";\r?\n/g, "");
    next = next.replace(/enabled: isRestApiEnabled\(\) && /g, "enabled: ");
    next = next.replace(
      /\s*if \(!isRestApiEnabled\(\)\) \{\s*throw new Error\("REST API is not enabled"\);\s*\}\s*/g,
      "\n",
    );
  }

  return next;
}

const targets = [
  path.join(root, "lib"),
  path.join(root, "components"),
  path.join(root, "app"),
  path.join(root, "hooks"),
  path.join(root, "types"),
];

let changed = 0;
for (const base of targets) {
  for (const file of walk(base)) {
    const original = fs.readFileSync(file, "utf8");
    const updated = transform(original, file);
    if (updated !== original) {
      fs.writeFileSync(file, updated);
      changed++;
    }
  }
}

console.log(`Updated ${changed} files`);
