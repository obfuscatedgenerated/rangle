const fs = require("fs");

if (!fs.existsSync("./public/daily/")) {
    console.log("No daily data found, skipping meta generation.");
    process.exit(0);
    return;
}

// get all json files with iso date format names
const files = fs.readdirSync("./public/daily/").filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file));

// make sure to sort the files by date ascending (probably already is but just in case)
files.sort();

const days = {};

// could be smart, but will regenerate all for now as it wont take long
files.forEach((file) => {
    const date = file.replace(".json", "");
    const data = JSON.parse(fs.readFileSync(`./public/daily/${file}`));

    days[date] = {
        number: data.number,
        difficulty: data.difficulty,
        neighbourhood: data.neighbourhood,
    };
});

const meta = {
    time: new Date().toISOString(),
    count: files.length,
    days,
};

fs.writeFileSync("./public/daily/meta.json", JSON.stringify(meta, null, 2));
console.log("Metadata generated successfully.");
