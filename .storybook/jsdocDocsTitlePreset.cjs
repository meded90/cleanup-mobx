const fs = require("node:fs");
const path = require("node:path");

const docsDir = path.join(process.cwd(), "src", "cleanup");
const docFilePattern = /\.doc\.mdx$/;

function getDocTitle(filePath) {
  return `docs/${path.basename(filePath, ".doc.mdx")}`;
}

function rewriteMdxFile(filePath) {
  if (!docFilePattern.test(filePath) || !fs.existsSync(filePath)) {
    return;
  }

  const title = getDocTitle(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const nextContent = content.replace(/<Meta title="[^"]+" \/>/, `<Meta title="${title}" />`);

  if (nextContent !== content) {
    fs.writeFileSync(filePath, nextContent);
  }
}

function rewriteAllMdxFiles() {
  if (!fs.existsSync(docsDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(docsDir)) {
    rewriteMdxFile(path.join(docsDir, fileName));
  }
}

function isStaticBuild() {
  return (
    process.env.STORYBOOK_DOCS_WATCH === "0" ||
    process.env.npm_lifecycle_event === "storybook:build" ||
    process.argv.some((arg) => arg === "build")
  );
}

function watchMdxFiles() {
  if (!fs.existsSync(docsDir)) {
    return;
  }

  fs.watch(docsDir, (eventType, fileName) => {
    if (typeof fileName !== "string" || !docFilePattern.test(fileName)) {
      return;
    }

    setTimeout(() => {
      rewriteMdxFile(path.join(docsDir, fileName));
    }, 25);
  });
}

module.exports = {
  managerEntries(entry = []) {
    rewriteAllMdxFiles();

    if (!isStaticBuild()) {
      watchMdxFiles();
    }

    return entry;
  },
  rewriteAllMdxFiles,
};
