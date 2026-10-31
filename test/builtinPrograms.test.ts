import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { parseProgramMarkdownContent } from "../src/utils/programUtils";

const builtinDir = path.resolve(__dirname, "../programs/builtin");

describe("Built-in programs", () => {
  for (const file of fs.readdirSync(builtinDir).filter((f) => f.endsWith(".md"))) {
    it(`parses ${file} without Liftoscript errors`, () => {
      const { content, data } = matter(fs.readFileSync(path.join(builtinDir, file), "utf8"));
      const result = parseProgramMarkdownContent(content, { ...data, id: data.id ?? path.basename(file, ".md") });
      expect(result.liftoscriptError).to.equal(undefined);
      expect(result.indexEntry.name).to.be.a("string").and.not.equal("");
    });
  }
});
