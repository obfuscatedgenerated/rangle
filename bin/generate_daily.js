const fs = require("fs");
const { Command } = require("commander");

const program = new Command();

program
    .name("generate_daily")
    .description("Generates the daily Rangle puzzle from Wikidata")
    .option("-d, --difficulty <difficulty>", "Difficulty level (easy, medium, hard)", "random")
    .option("-n, --neighbourhood <neighbourhood>", "Neighbourhood of values (small, medium, large)", "random")
    .option("-o, --offset <days>", "Number of days in the future to generate for", "0")
    .option("-f, --force", "Force generation even if today's file already exists", false)
    .option("-p, --properties <propertyID1,propertyID2,...>", "Comma-separated list of specific Wikidata property IDs to use instead of random selection. If less than 10, random properties will be added to fill the gap.")
    .option("--no-backfill", "Disable backfilling to 10 properties if custom properties are provided, i.e. only use the specified ones. If no properties are provided, there won't be any!")
    .option("-v, --verbose", "Enable verbose logging for debugging purposes", false);

program.parse();

const { difficulty: difficulty_arg, neighbourhood: neighbourhood_arg, offset: offset_arg, force: force_arg, properties: properties_arg, verbose, backfill } = program.opts();

const {epoch_utc, time_zone} = require("../time");
const NEIGHBOURHOODS = ["small", "medium", "large"];

// all the countable properties to include in the game
const properties = {
    // usually up to a few hundred at most, some outliers up towards 1000 but will caught by sliding window
    "small": [
        { id: "P2048", name: "Height", suffix: " cm", classes: ["Q5"], skip_class_recurse: true, unit_hint: "in centimeters", normalised: true, parser: (v) => Math.round(v * 100) }, // Human
        { id: "P2043", name: "Length", suffix: " cm", classes: ["Q1390", "Q2102", "Q6607"], unit_hint: "in centimeters, on average", normalised: true, parser: (v) => Math.round(v * 100) }, // Insects, Snakes, Guitars
        { id: "P2067", name: "Mass / Weight", suffix: " grams", classes: ["Q1309492", "Q5113", "Q1390"], unit_hint: "in grams", normalised: true, parser: (v) => Math.round(v * 1000) }, // Fruits, Birds, Insects

        {
            id: "P2250",
            name: "Life Expectancy / Maximum Lifespan",
            suffix: " years",
            // Taxon
            classes: ["Q16521"],
            skip_class_recurse: true,
            unit_hint: "in years",
            normalised: true, parser: (v) => Math.round(v / 31556952),
            sitelink_override: {
                Easy: { min: 100, max: 3000 },
                Medium: { min: 30, max: 99 },
                Hard: { min: 1, max: 29 }
            }
        },
        {
            id: "P3063",
            name: "Gestation Period",
            suffix: " days",
            // Taxon
            classes: ["Q16521"],
            skip_class_recurse: true,
            unit_hint: "in days",
            normalised: true,
            parser: (v) => Math.round(v / 86400),
            sitelink_override: {
                Easy: { min: 100, max: 3000 },
                Medium: { min: 30, max: 99 },
                Hard: { min: 1, max: 29 }
            }
        },
        { id: "P2047", name: "Duration / Runtime", suffix: " minutes", classes: ["Q11424", "Q2188189", "Q7889"], unit_hint: "in minutes", normalised: true, parser: (v) => Math.round(v / 60) }, // Film, Music, Game
        {
            id: "P1113",
            name: "Number of Episodes",
            suffix: " episodes",

            // TV series, Podcast
            classes: ["Q5398426", "Q20899"],

            // tv series are often regional, so lower the ranges a bit
            sitelink_override: {
                Easy: { min: 30, max: 3000 },
                Medium: { min: 10, max: 29 },
                Hard: { min: 4, max: 9 }
            }
        },
        {
            id: "P2437",
            name: "Number of Seasons",
            suffix: " seasons",
            classes: ["Q5398426"],
            sitelink_override: {
                Easy: { min: 10, max: 3000 },
                Medium: { min: 5, max: 9 },
                Hard: { min: 1, max: 4 }
            }
        },
        {
            id: "P2665",
            name: "Alcohol by Volume",
            suffix: "%",
            classes: ["Q154"], // alcoholic beverage
            unit_hint: "by approx. percent",

            // needs to be relaxed too
            sitelink_override: {
                Easy: { min: 30, max: 60 },
                Medium: { min: 12, max: 29 },
                Hard: { min: 1, max: 11 }
            }
        },

        {
            id: "P1725",
            name: "Tempo",
            suffix: " BPM",
            classes: ["Q2188189", "Q7366"], // Musical Work, Song
            skip_class_recurse: true,
            unit_hint: "beats per minute",

            sitelink_override: {
                Easy: { min: 27, max: 3000 },
                Medium: { min: 10, max: 26 },
                Hard: { min: 3, max: 9 }
            }
        },

        { id: "P1101", name: "Number of Floors", suffix: " floors", classes: ["Q41176"] }, // Building

        {
            id: "P1685",
            name: "Pokédex Number",
            prefix: "#",
            suffix: "",
            classes: ["Q3966183"], // pokemon species

            // pokemon are obviously referenced less than other things so need to relax the sitelink ranges
            sitelink_override: {
                Easy: { min: 22, max: 3000 },
                Medium: { min: 12, max: 21 },
                Hard: { min: 1, max: 11 }
            }
        }
    ],

    // thousands
    "medium": [
        { id: "P2048", name: "Height", suffix: " m", classes: ["Q41176", "Q40218", "Q10884"], unit_hint: "in metres", normalised: true, parser: (v) => Math.round(v) }, // Building, Spacecraft, Tree
        { id: "P2043", name: "Length", suffix: " m", classes: ["Q4022", "Q12280", "Q11446"], unit_hint: "in metres", normalised: true, parser: (v) => Math.round(v) }, // River, Bridge, Ship
        { id: "P2067", name: "Mass / Weight", suffix: " kg", classes: ["Q5", "Q1420", "Q7377", "Q110551885"], unit_hint: "in kilograms", normalised: true, parser: (v) => Math.round(v) }, // Humans, Cars, Mammals
        { id: "P2050", name: "Wingspan", suffix: " m", classes: ["Q729", "Q11436"], unit_hint: "in metres", normalised: true, parser: (v) => Math.round(v) }, // Animal, Aircraft
        { id: "P4511", name: "Depth", suffix: " m", classes: ["Q23397", "Q9430"], unit_hint: "in metres", normalised: true, parser: (v) => Math.round(v) }, // Lake, Ocean
        { id: "P2052", name: "Top Speed", suffix: " km/h", classes: ["Q11436", "Q1420", "Q870", "Q729"], unit_hint: "in km/h", normalised: true, parser: (v) => Math.round(v * 3.6) }, // Aircraft, Car, Train, Animal
        { id: "P2102", name: "Boiling Point", suffix: "°C", classes: ["Q11344", "Q11173"], normalised: true, parser: (k) => Math.round(Number(k) - 273.15), unit_hint: "in Celsius" },
        { id: "P2044", name: "Elevation above sea level", suffix: " m", classes: ["Q8502", "Q515", "Q1248784"], unit_hint: "in metres", normalised: true, parser: (v) => Math.round(v) }, // Mountain, City, Airport

        { id: "P2043", name: "Length", suffix: " km", classes: ["Q34442", "Q133346"], unit_hint: "in kilometres", normalised: true, parser: (v) => Math.round(v / 1000) }, // Roads, Borders
        { id: "P2067", name: "Mass / Weight", suffix: " tonnes", classes: ["Q11446", "Q11436"], unit_hint: "in metric tonnes", normalised: true, parser: (v) => Math.round(v / 1000) }, // Ships, Aircraft

        { id: "P571", name: "Year of Creation / Inception", classes: ["Q4830453", "Q6256", "Q11424"], parser: (d) => new Date(d).getFullYear() },
        { id: "P569", name: "Year of Birth", classes: ["Q5"], parser: (d) => new Date(d).getFullYear() },
        { id: "P575", name: "Year of Discovery", classes: ["Q11344", "Q3863"], parser: (d) => new Date(d).getFullYear() }, // Element, Asteroid
        { id: "P3346", name: "Spiciness (Scoville Scale)", suffix: " SHU", classes: ["Q165199", "Q178359"] }, // Chili, Sauce

        { id: "P1104", name: "Number of Pages", suffix: " pages", classes: ["Q7725634", "Q571"] } // Lit Work, Book
    ],

    // 100k and million and billion scale
    "large": [
        { id: "P2243", name: "Distance from Sun", suffix: " km", classes: ["Q634", "Q3863"], unit_hint: "in kilometres", normalised: true, parser: (v) => Math.round(v / 1000) }, // Planet, Asteroid
        { id: "P2046", name: "Area", suffix: " sq km", classes: ["Q6256", "Q23442", "Q515"], unit_hint: "in sq km", normalised: true, parser: (v) => Math.round(v / 1000000) }, // Country, Island, City

        { id: "P2139", name: "Total Revenue", prefix: "$", suffix: "", classes: ["Q4830453", "Q11424"], skip_class_recurse: true, unit_hint: "in dollars" },
        { id: "P2218", name: "Total Net Worth", prefix: "$", suffix: "", classes: ["Q5"], unit_hint: "in dollars" },
        { id: "P2226", name: "Market Capitalisation", prefix: "$", suffix: "", classes: ["Q4830453"], unit_hint: "in dollars" },
        { id: "P2130", name: "Production Budget", prefix: "$", suffix: "", classes: ["Q11424", "Q7889"], unit_hint: "in dollars" }, // Film, Game
        { id: "P2142", name: "Total Box Office Revenue", prefix: "$", suffix: "", classes: ["Q11424"], unit_hint: "in dollars" },
        { id: "P2664", name: "Total Units Sold", suffix: " units", unit_hint: "approx.", classes: ["Q7889", "Q2188189", "Q571", "Q2424752"] },

        { id: "P1082", name: "Population", suffix: " people", classes: ["Q1549591", "Q5119", "Q3624078"] }, // Big City, Capital, Sovereign State
        { id: "P1098", name: "Native Speakers", suffix: " speakers", classes: ["Q34770"] },
        { id: "P1128", name: "Number of Employees", suffix: " employees", classes: ["Q4830453", "Q352450"] }, // Business, Agency
        { id: "P1110", name: "Event Attendance", suffix: " attendees", classes: ["Q1656682"] }, // Event
        { id: "P1083", name: "Maximum Capacity", suffix: " people", classes: ["Q483110", "Q240854"] }, // Stadium, Hall
        { id: "P2196", name: "Student Enrollment", suffix: " students", classes: ["Q3918", "Q3914"] }, // Uni, School // TODO: does this belong in large, or is the high end of medium, or in between!!! maybe we need large and mega
        { id: "P3872", name: "Number of Passengers", suffix: " passengers", unit_hint: "annual", classes: ["Q1248784", "Q55488"] } // Airport, Station
    ]
};

// TODO: fix temperature conversion
// TODO: say the point in time for money values

// TODO: way to exclude dictators and controversial figures?

const exclude_categories = [
    { id: "Q198", name: "War / Armed Conflict" },
    { id: "Q3839081", name: "Disaster" },
    { id: "Q8065", name: "Natural disaster" },
    { id: "Q12136", name: "Disease / Illness" },
    { id: "Q83267", name: "Crime" },
    { id: "Q7283", name: "Terrorism / Terrorist Attack" },
    { id: "Q750215", name: "Mass Murder" },
    { id: "Q484188", name: "Serial Killer" },
    { id: "Q41397", name: "Genocide" },
    { id: "Q8454", name: "Execution" },
    { id: "Q3199915", name: "Massacre" },
    { id: "Q44512", name: "Epidemic" },
    { id: "Q12184", name: "Pandemic" },
    { id: "Q171558", name: "Accident" },
    { id: "Q852190", name: "Shipwreck" },
    { id: "Q906512", name: "Shipwrecking" },
    { id: "Q10737", name: "Suicide" },
    { id: "Q3184856", name: "Drug Abuse" },
    { id: "Q3505252", name: "Overdose" },
    { id: "Q291", name: "Pornography" },
    { id: "Q5801919", name: "Sex Crime" },
    { id: "Q8463", name: "Slavery" },
    { id: "Q132781", name: "Torture" },
    { id: "Q728", name: "Weapon" },
    { id: "Q911807", name: "Explosive" },
    { id: "Q4620674", name: "Sex organ" },
    { id: "Q10816", name: "Sex toy" },
    { id: "Q5873", name: "Sex act" }
];

const difficulties = {
    "easy": {
        label: "Easy",
        min: 150,
        max: 3000,
        tightness: {"small": 20, "medium": 50, "large": 100}
    },

    "medium": {
        label: "Medium",
        min: 80,
        max: 149,
        tightness: {"small": 10, "medium": 25, "large": 50}
    },

    "hard": {
        label: "Hard",
        min: 40,
        max: 79,
        tightness: {"small": 5, "medium": 8, "large": 15}
    }
};

const choose_difficulty = () => {
    const rng = Math.random();

    // 20% chance for something pretty easy, very famous
    if (rng < 0.20) return difficulties.easy;

    // 20% chance for something quite hard, niche but verifiable
    if (rng < 0.40) return difficulties.hard;

    // 60% chance for a medium challenge, standard trivia
    return difficulties.medium;
};

const fetch_single_property = async (prop, difficulty) => {
    console.log(`Fetching data for ${prop.name} (${prop.id})...`);

    // TODO: retry on 429 or 504 after delay

    // some properties specify an override for sitelink ranges by difficulty
    const resolved_sitelink_range = {
        min: prop.sitelink_override?.[difficulty.label]?.min || difficulty.min,
        max: prop.sitelink_override?.[difficulty.label]?.max || difficulty.max
    };

    const class_list = prop.classes
        ? prop.classes.map(c => `wd:${c}`).join(" ")

        // fallback to logical entity
        : "wd:Q15228";

    // TODO: allow this to be specified per class in some cases? still allow this flag as its easier if its everyone, but sometimes we want to recurse some classes and not others (could use special char)
    const class_filter = prop.skip_class_recurse
        ? `?item wdt:P31 ?allowedClass .`
        : `?item wdt:P31/wdt:P279* ?allowedClass .`;

    // coordinates have a different prop name
    const value_selection = prop.id === "P625"
        ? "(SAMPLE(?rawValue) AS ?value)"
        //: "(SAMPLE(?value) AS ?value)";

        // now using max as its typically more correct if data isnt deprecated (e.g. populations typically grow)
        : "(MAX(?rawValue) AS ?value)";

    const query = `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ${value_selection} WHERE {
      # 1. Start with the property. This acts as a massive primary filter.
      ${prop.normalised ? `
        # Normalised Path: needs manual rank filter to avoid old/deprecated data
        ?item p:${prop.id} ?statement .
        ?statement psn:${prop.id}/wikibase:quantityAmount ?rawValue .
        ?statement wikibase:rank ?rank .
        FILTER(?rank != wikibase:DeprecatedRank) 
      ` : `
        # Truthy Path: automatically excludes deprecated, but can still return multiple 'Normal' ranks
        ?item wdt:${prop.id} ?rawValue .
      `}
      
      # 2. Filter by sitelinks NEXT. 
      ?item wikibase:sitelinks ?sitelinks .
      FILTER(?sitelinks >= ${resolved_sitelink_range.min} && ?sitelinks <= ${resolved_sitelink_range.max})
      
      # 3. FINALLY, check the class hierarchy on the surviving items.
      VALUES ?allowedClass { ${class_list} }
      ${class_filter}
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    # 4. Mandatory Grouping for Aggregates
    GROUP BY ?item ?itemLabel ?itemDescription
    LIMIT 200`;

    try {
        const response = await fetch("https://query.wikidata.org/sparql", {
            method: "POST",
            headers: {
                "Accept": "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "RangleGame/1.0 (ranglebot@ollieg.codes)"
            },
            body: new URLSearchParams({ query })
        });

        if (!response.ok) {
            console.error(`Wikidata error for ${prop.name}: ${response.status} ${response.statusText}: ${await response.text()}`);
            return [];
        }

        const text = await response.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error(`Error parsing JSON for ${prop.name}:`, e.message);
            return [];
        }

        console.log(`Received response for ${prop.name} with ${data.results.bindings.length} entries`);

        return data.results.bindings.map(r => {
            const raw = r.coord ? r.coord.value : r.value.value;
            const parsed = prop.parser ? prop.parser(raw) : parseFloat(raw);

            if (verbose) {
                console.log(`Parsed value for ${r.itemLabel.value} (${prop.name}):`, {
                    raw,
                    parsed,
                    unit_hint: prop.unit_hint
                });
            }

            return {
                id: r.item.value.split("/").pop(),
                name: r.itemLabel.value,
                metric: prop.name,
                description: r.itemDescription ? r.itemDescription.value : undefined,
                value: parsed,
                suffix: (prop.suffix || ""),
                prefix: (prop.prefix || ""),
                unit_hint: prop.unit_hint
            };
        }).filter(
            item =>
                // no nan or 0 values
                !isNaN(item.value)
                && item.value > 0

                // no junk names where the label is just the id
                && !(/^Q\d+$/.test(item.name))
        );
    } catch (e) {
        console.error(`Error fetching ${prop.name}:`, e.message);
        return [];
    }
};

const check_if_safe = async (candidates) => {
    const item_ids = candidates.map(i => `wd:${i.id}`).join(" ");
    const excluded_ids = exclude_categories.map(ex => `wd:${ex.id}`).join(" ");

    const query = `
    SELECT ?item WHERE {
      VALUES ?item { ${item_ids} }
      VALUES ?badCategory { ${excluded_ids} }
      ?item wdt:P31/wdt:P279* ?badCategory .
    }`;

    const response = await fetch("https://query.wikidata.org/sparql", {
        method: "POST",
        headers: { "Accept": "application/sparql-results+json", "User-Agent": "RangleGame/1.0" },
        body: new URLSearchParams({ query })
    });
    const data = await response.json();

    // filter out any candidates that appear in the results
    const bad_ids = new Set(data.results.bindings.map(r => r.item.value.split("/").pop()));
    return candidates.filter(c => !bad_ids.has(c.id));
};

const main = async () => {
    const now = new Date();

    // formatted to the target timezone but as a string, so decoupled from timezone but still represents the current time in that timezone
    const tz_time_str = now.toLocaleString("en-US", { timeZone: time_zone });

    // parse back as a local date, which effectively gives us the current time in the target timezone as a Date object
    const tz_time_mock = new Date(tz_time_str);

    // apply offset days
    if (offset_arg) {
        const offset_days = parseInt(offset_arg, 10);
        if (!isNaN(offset_days)) {
            tz_time_mock.setDate(tz_time_mock.getDate() + offset_days);
        }
    }

    // manually format to iso safely
    const year = tz_time_mock.getFullYear();
    const month = String(tz_time_mock.getMonth() + 1).padStart(2, "0");
    const day = String(tz_time_mock.getDate()).padStart(2, "0");
    const today_date_iso = `${year}-${month}-${day}`;

    // check if today's file already exists
    if (fs.existsSync(`./public/daily/${today_date_iso}.json`)) {
        if (force_arg) {
            console.warn("Today's file already exists, but --force is set, so regenerating...");
        } else {
            console.log("Today's file already exists, skipping generation.");
            return;
        }
    }

    // pick a difficulty and neighbourhood for today
    const difficulty = difficulties[difficulty_arg.toLowerCase()] || choose_difficulty();
    const neighbourhood = NEIGHBOURHOODS.includes(neighbourhood_arg.toLowerCase()) ? neighbourhood_arg.toLowerCase() : NEIGHBOURHOODS[Math.floor(Math.random() * NEIGHBOURHOODS.length)];

    console.log(`Today's Rangle will be ${difficulty.label} with ${neighbourhood} values.`);

    const subset_props = [];

    // if properties were provided via command line, use those and add random ones to fill up to 10
    if (properties_arg) {
        const provided_props = properties_arg.split(",").map(p => p.trim());
        // TODO: handle ids without a P at the start

        // search all neighbourhoods for the provided properties
        // starting with the chosen neighbourhood (as some properties appear in multiple)
        // TODO: clearer specificer in case they really do want one from another hood
        const matched_props = [];
        for (const nbhd of [neighbourhood, ...NEIGHBOURHOODS.filter(n => n !== neighbourhood)]) {
            for (const prop of properties[nbhd]) {
                // skip properties already matched from a previous neighbourhood to avoid duplicates
                // TODO: not the best algorithm
                if (matched_props.some(p => p.id === prop.id)) {
                    continue;
                }

                if (provided_props.includes(prop.id)) {
                    matched_props.push(prop);

                    // warn if they provided a property that doesn't exist in the chosen neighbourhood, but still add it to the pool
                    if (nbhd !== neighbourhood) {
                        console.warn(`Provided property ${prop.id} (${prop.name}) is not in the chosen neighbourhood (${neighbourhood}), but it will still be included in the pool.`);
                    }
                }
            }
        }

        // add matched properties to the front of the list
        subset_props.unshift(...matched_props);
    }

    if (backfill) {
        // fill up to 10 properties with random ones from the chosen neighbourhood, ensuring no duplicates with provided ones
        while (subset_props.length < 10) {
            const random_prop = properties[neighbourhood][Math.floor(Math.random() * properties[neighbourhood].length)];
            if (!subset_props.some(p => p.id === random_prop.id)) {
                subset_props.push(random_prop);
            }
        }
    }

    // fetch properties with up to 3 in parallel, giving a fair delay to stay within limits
    const pool = [];
    for (let i = 0; i < subset_props.length; i += 3) {
        const batch = subset_props.slice(i, i + 3);
        const results = await Promise.all(batch.map(prop => fetch_single_property(prop, difficulty)));
        pool.push(...results.flat());
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // bucket the pool with a sliding window on the sorted pool, keeping the magnitude close for a challenge
    // this is much less harsh than the old exact magnitude buckets
    const sorted_pool = pool.sort((a, b) => a.value - b.value);

    const valid_buckets = [];

    let current_tightness = difficulty.tightness[neighbourhood];
    let bucket_attempts = 0;

    while (valid_buckets.length === 0) {
        for (let i = 0; i < sorted_pool.length; i++) {
            const bucket = [];
            const min_val = sorted_pool[i].value;

            // largest item can be up to a certain multiplier of the value of the smallest depending on difficulty and neighbourhood
            const max_allowed = min_val * current_tightness;

            for (let j = i; j < sorted_pool.length; j++) {
                if (sorted_pool[j].value <= max_allowed) {
                    bucket.push(sorted_pool[j]);
                } else {
                    // too big
                    break;
                }
            }

            // filter out buckets that are too small. the final lineup will be 5 items but
            // we want some extra in case some are discarded for being unsafe or too close
            // pre-check the diversity too
            const unique_metrics = new Set(bucket.map(item => item.metric));

            // if less than 3 props in use then dont enforce the diversity check
            if (bucket.length >= 12 && (unique_metrics.size >= 3 || subset_props.length <= 3)) {
                valid_buckets.push(bucket);

                // skip ahead to the next bucket start
                i += Math.floor(bucket.length / 2);
            }
        }

        if (valid_buckets.length === 0) {
            if (bucket_attempts >= 5) {
                console.error("Couldn't find any valid buckets after multiple attempts, restarting generation...");
                return main();
            } else {
                console.warn("Didn't find any valid buckets, relaxing tightness and trying again...");
                bucket_attempts++;
                current_tightness *= 1.25;
            }
        }
    }

    // shuffle bucket order and iterate until first valid one is found
    valid_buckets.sort(() => 0.5 - Math.random());

    let success = false;
    for (const chosen_bucket of valid_buckets) {
        // dont allow equal values or names
        const unique_value_pool = new Set();
        const seen_names = new Set();
        const seen_values = new Set();

        for (const item of chosen_bucket) {
            if (seen_names.has(item.name) || seen_values.has(item.value)) {
                continue; // skip duplicates
            }

            seen_names.add(item.name);
            seen_values.add(item.value);
            unique_value_pool.add(item);
        }

        if (unique_value_pool.size < 10) {
            console.error("Not enough unique items in the chosen bucket, trying next bucket...");
            continue;
        }

        const sorted_candidates = Array.from(unique_value_pool).sort((a, b) => a.value - b.value);

        // select up to 30 evenly distributed candidates
        const candidates = [];
        const step = Math.max(1, Math.floor(sorted_candidates.length / 30));
        for (let i = 0; i < sorted_candidates.length && candidates.length < 30; i += step) {
            candidates.push(sorted_candidates[i]);
        }

        // check candidates for safety and sort once more for gap check
        const safe_items = await check_if_safe(candidates);
        const sorted_safe = safe_items.sort((a, b) => a.value - b.value);

        const lineup = [];
        const metric_counts = {};

        for (const item of sorted_safe) {
            // ensure metric diversity
            // if num of props in play is less than 3 then disable this check
            if (metric_counts[item.metric] >= 2 && subset_props.length > 3) {
                continue;
            }

            // ensure no items are too close together (e.g. within 5% of each other) to avoid ambiguity in the game
            const last_item = lineup[lineup.length - 1];
            if (last_item && Math.abs(item.value - last_item.value) / Math.max(item.value, last_item.value) < 0.05) {
                continue;
            }

            lineup.push(item);
            metric_counts[item.metric] = (metric_counts[item.metric] || 0) + 1;

            // final lineup must be 5 items
            if (lineup.length === 5) {
                break;
            }
        }

        if (lineup.length < 5) {
            console.error("Couldn't find enough safe and well-spaced items, trying next bucket...");
            continue;
        }

        success = true;

        // console.log("Today's lineup:");
        // lineup.forEach(item => {
        //     console.log(`${item.name} (${item.metric}): ${item.prefix}${item.value}${item.suffix}`);
        // });

        // create shuffled lineup to serve to players, but save the original order to check against for the shuffle quality
        const shuffled_lineup = [...lineup].sort(() => 0.5 - Math.random());

        // if the shuffled order is very close to the original order (e.g. more than 2 items in the same position), reshuffle
        while (true) {
            let same_position_count = 0;
            for (let i = 0; i < lineup.length; i++) {
                if (lineup[i].id === shuffled_lineup[i].id) {
                    same_position_count++;
                }
            }

            if (same_position_count > 2) {
                console.log("Shuffled lineup is too close to original order, reshuffling...");
                shuffled_lineup.sort(() => 0.5 - Math.random());
            } else {
                break;
            }
        }

        console.log("Today's lineup (shuffled and without values to avoid spoilers):");
        shuffled_lineup.forEach(item => {
            console.log(`${item.name} (${item.metric})`);
        });

        const target_midnight = new Date(`${today_date_iso}T00:00:00Z`).getTime();
        const epoch_midnight = new Date(epoch_utc).getTime();

        // build the final data
        const final_data = {
            date: today_date_iso,
            number: Math.floor((target_midnight - epoch_midnight) / (1000 * 60 * 60 * 24)) + 1,
            difficulty: difficulty.label,
            neighbourhood,
            puzzle: shuffled_lineup.map(item => ({
                id: item.id,
                name: item.name,
                value: item.value,
                metric: item.metric,
                description: item.description,
                prefix: item.prefix,
                suffix: item.suffix,
                unit_hint: item.unit_hint
            }))
        };

        // ensure daily directory exists
        if (!fs.existsSync("./public/daily")){
            fs.mkdirSync("./public/daily");
        }

        // save to archive with date stamp
        fs.writeFileSync(`./public/daily/${today_date_iso}.json`, JSON.stringify(final_data, null, 2));

        break;
    }

    if (!success) {
        console.error("Couldn't find a valid lineup, starting over...");
        return main();
    }
}

main();
