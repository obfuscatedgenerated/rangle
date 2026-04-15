import fs from "fs";
import matter from "gray-matter";
import {remark} from "remark";
import remark_html from "remark-html";

const CHANGELOG_FILE = "./CHANGELOG.md";
const OUTPUT_FILE = "./src/generated_changelog.json";

const compile_changelog = async () => {
    if (!fs.existsSync(CHANGELOG_FILE)) {
        console.error(`Changelog file not found: ${CHANGELOG_FILE}`);
        return;
    }

    const changelog_content = fs.readFileSync(CHANGELOG_FILE, "utf-8");
    const changelog_data = matter(changelog_content);

    const changelog_json = {
        latest: changelog_data.data.latest,
        entries: []
    };

    const markdown_entries = changelog_data.content.split("\n## ").slice(1);
    for (const entry of markdown_entries) {
        const [header, ...body] = entry.split("\n");
        const date = header.trim();
        const body_markdown = body.join("\n").trim();

        const html_content = await remark()
            .use(remark_html)
            .process(body_markdown);

        changelog_json.entries.push({
            date,
            content: html_content.toString()
        });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(changelog_json, null, 2), "utf-8");
    console.log(`Changelog compiled successfully to ${OUTPUT_FILE}`);
}

compile_changelog();
