const NEIGHBOURHOODS = ["small", "medium", "large"];

// all the countable properties to include in the game
const properties = {
    "small": [
        { id: "P3150", name: "Maximum Lifespan", suffix: " years", classes: ["Q16521", "Q729"] }, // Taxon, Animal
        { id: "P3095", name: "Gestation Period", suffix: " days", classes: ["Q16521", "Q729"] },
        { id: "P2050", name: "Wingspan", suffix: " m", classes: ["Q16521", "Q11436"] }, // Taxon, Aircraft
        { id: "P2047", name: "Duration / Runtime", suffix: " minutes", classes: ["Q11424", "Q2188189", "Q7889"] }, // Film, Music, Game
        { id: "P1113", name: "Number of Episodes", suffix: " episodes", classes: ["Q5398426", "Q16521"] }, // TV, Podcast
        { id: "P1301", name: "Number of Seasons", suffix: " seasons", classes: ["Q5398426"] },
        { id: "P1536", name: "Alcohol by Volume (ABV)", suffix: "%", classes: ["Q213253", "Q44"] }, // Beverage, Beer
        { id: "P4354", name: "Tempo / Beats Per Minute", suffix: " BPM", classes: ["Q2188189"] },
        { id: "P1128", name: "Number of Floors / Storeys", suffix: " floors", classes: ["Q41176", "Q1021643"] }, // Building, Skyscraper
        { id: "P166", name: "Awards Received", suffix: " awards", classes: ["Q5", "Q43229"], parser: (v) => Array.isArray(v) ? v.length : 1 },
        // coords are quite heavy for wikidata so disabled for now. could add a filter to force a certain relevance to prevent the scan
        // {
        //     id: "P625",
        //     name: "Distance from Equator",
        //     suffix: "° from Equator",
        //     classes: ["Q515", "Q6256"],
        //     parser: (coord) => {
        //         const match = coord.match(/Point\([^ ]+\s+([-+]?\d+\.?\d*)\)/);
        //         return match ? Math.abs(parseFloat(match[1])) : 0;
        //     }
        // },
    ],

    "medium": [
        { id: "P2048", name: "Height", suffix: " m", classes: ["Q5", "Q41176", "Q754507", "Q10884"] }, // Human, Building, Rocket, Tree
        { id: "P2043", name: "Length", suffix: " m", classes: ["Q4022", "Q12280", "Q11446"] }, // River, Bridge, Ship
        { id: "P2044", name: "Elevation above sea level", suffix: " m", classes: ["Q8502", "Q515", "Q1248784"] }, // Mountain, City, Airport
        { id: "P2052", name: "Top Speed", suffix: " km/h", classes: ["Q11436", "Q7946", "Q870", "Q729"] }, // Aircraft, Car, Train, Animal
        { id: "P2045", name: "Depth", suffix: " m", classes: ["Q1532", "Q9472"] }, // Lake, Ocean
        { id: "P3346", name: "Spiciness (Scoville Scale)", suffix: " SHU", classes: ["Q331469", "Q23146"] }, // Chili, Sauce
        { id: "P1104", name: "Number of Pages", suffix: " pages", classes: ["Q7725", "Q571"] }, // Lit Work, Book
        { id: "P571", name: "Year of Creation / Inception", classes: ["Q4830453", "Q6256", "Q11424"], parser: (d) => new Date(d).getFullYear() },
        { id: "P569", name: "Year of Birth", classes: ["Q5"], parser: (d) => new Date(d).getFullYear() },
        { id: "P570", name: "Year of Death", classes: ["Q5"], parser: (d) => new Date(d).getFullYear() },
        { id: "P575", name: "Year of Discovery", classes: ["Q11344", "Q3863"], parser: (d) => new Date(d).getFullYear() }, // Element, Asteroid
        { id: "P2102", name: "Boiling Point", suffix: "°C", classes: ["Q11344", "Q11173"], parser: (k) => Math.round(Number(k) - 273.15) },
    ],

    "large": [
        { id: "P1082", name: "Population", suffix: " people", classes: ["Q515", "Q6256"] }, // City, Country
        { id: "P2067", name: "Mass / Weight", suffix: " kg", classes: ["Q634", "Q11022", "Q11446"] }, // Planet, Star, Ship
        { id: "P2046", name: "Area", suffix: " sq km", classes: ["Q6256", "Q23442", "Q515"] }, // Country, Island, City
        { id: "P2664", name: "Number of Employees", suffix: " employees", classes: ["Q4830453", "Q2655353"] }, // Business, Agency
        { id: "P1098", name: "Native Speakers", suffix: " speakers", classes: ["Q34770"] },
        { id: "P1110", name: "Event Attendance", suffix: " attendees", classes: ["Q16567", "Q1076531"] }, // Event, Match
        { id: "P3762", name: "Student Enrollment", suffix: " students", classes: ["Q3918", "Q3914"] }, // Uni, School
        { id: "P2133", name: "Total Revenue", prefix: "$", suffix: "", classes: ["Q4830453", "Q11424"] },
        { id: "P2403", name: "Total Net Worth", prefix: "$", suffix: "", classes: ["Q5"] },
        { id: "P2127", name: "Market Capitalisation", prefix: "$", suffix: " Billion", classes: ["Q4830453"], parser: (v) => Math.round(Number(v) / 1_000_000_000) },
        { id: "P2130", name: "Production Budget", prefix: "$", suffix: "", classes: ["Q11424", "Q7889"] }, // Film, Game
        { id: "P2139", name: "Total Box Office Revenue", prefix: "$", suffix: "", classes: ["Q11424"] },
        { id: "P1143", name: "Total Word Count", suffix: " words", classes: ["Q7725", "Q571"] },
        { id: "P3734", name: "Social Media Followers", suffix: " followers", classes: ["Q5", "Q215380"] }, // Human, Band
        { id: "P8627", name: "YouTube Subscribers", suffix: " subscribers", classes: ["Q5", "Q4830453"] },
        { id: "P10985", name: "Spotify Monthly Listeners", suffix: " listeners", classes: ["Q5", "Q215380"] },
        { id: "P3143", name: "Subreddit Subscribers", suffix: " members", classes: ["Q3962", "Q7889"] }, // Website, Game
        { id: "P1083", name: "Maximum Capacity", suffix: " people", classes: ["Q48310", "Q182832"] }, // Stadium, Hall
        { id: "P2951", name: "Number of Passengers", suffix: " passengers", classes: ["Q1248784", "Q55488"] }, // Airport, Station
        { id: "P2243", name: "Approximate Distance from Sun", suffix: " km", classes: ["Q634", "Q3863"] } // Planet, Asteroid
    ]
};

// TODO: dynamic formatter so market cap doesnt always have to be billion, can write a query to flip between latitude and longitude etc

// horrible stuff
const exclude_categories = [
    { id: "Q198", name: "War / Armed Conflict" },
    { id: "Q8065", name: "Disaster" },
    { id: "Q12136", name: "Disease / Illness" },
    { id: "Q83267", name: "Crime" },
    { id: "Q10806174", name: "Terrorist Attack" },
    { id: "Q13101262", name: "Mass Murder" },
    { id: "Q170584", name: "Serial Killer" },
    { id: "Q3122841", name: "Genocide" },
    { id: "Q170784", name: "Execution" },
    { id: "Q128758", name: "Terrorist Attack" },
    { id: "Q319965", name: "Massacre" },
    { id: "Q133171", name: "Epidemic / Pandemic" },
    { id: "Q178225", name: "Accident" },
    { id: "Q906564", name: "Shipwreck" },
    { id: "Q10737", name: "Suicide" },
    { id: "Q7937", name: "Drug Abuse / Overdose" },
    { id: "Q36450", name: "Pornography" },
    { id: "Q131102", name: "Sex Crime" },
    { id: "Q8050", name: "Slavery" },
    { id: "Q132781", name: "Torture" },
];

const choose_difficulty = () => {
    const rng = Math.random();

    // 20% chance for something pretty easy
    if (rng < 0.20) return { label: "Easy", min: 150, max: 1000 };

    // 20% chance for something quite hard
    if (rng < 0.40) return { label: "Hard", min: 35, max: 70 };

    // 60% chance for a medium challenge
    return { label: "Medium", min: 70, max: 150 };
};

const fetch_single_property = async (prop, difficulty) => {
    console.log(`Fetching data for ${prop.name}...`);

    const value_var = prop.id === "P625" ? "?coord" : "?value";

    const class_list = prop.classes
        ? prop.classes.map(c => `wd:${c}`).join(" ")

        // fallback to logical entity
        : "wd:Q15228";

    const query = `
    SELECT ?item ?itemLabel ${value_var} WHERE {
      # 1. Provide the list of allowed classes
      VALUES ?allowedClass { ${class_list} }
      
      # 2. Match items that are an instance of any allowed class (or its subclasses)
      ?item wdt:P31/wdt:P279* ?allowedClass .
      
      # 3. Get the property value
      ?item wdt:${prop.id} ${value_var} .
      
      # 4. Standard performance hints and sitelink filters
      hint:Prior hint:rangeSafe "true" . 
      ?item wikibase:sitelinks ?sitelinks .
      FILTER(?sitelinks >= ${difficulty.min} && ?sitelinks <= ${difficulty.max})
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 80`;

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

        console.log(`Received response for ${prop.name}`);

        if (!response.ok) {
            console.error(`Wikidata error: ${response.status}`);
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

        return data.results.bindings.map(r => {
            const raw = r.coord ? r.coord.value : r.value.value;
            const parsed = prop.parser ? prop.parser(raw) : parseFloat(raw);

            return {
                id: r.item.value.split("/").pop(),
                name: r.itemLabel.value,
                metric: prop.name,
                value: parsed,
                suffix: (prop.suffix || ""),
                prefix: (prop.prefix || "")
            };
        }).filter(item => !isNaN(item.value) && item.value > 0);
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
    // pick a difficulty and neighbourhood for today
    const difficulty = choose_difficulty();
    const neighbourhood = NEIGHBOURHOODS[Math.floor(Math.random() * 3)];

    console.log(`Today's Rangle will be ${difficulty.label} with ${neighbourhood} values.`);

    // pick 10 random properties from the neighbourhood
    const subset_props = properties[neighbourhood]
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

    // fetch properties with up to 3 in parallel, giving a fair delay to stay within limits
    const pool = [];
    for (let i = 0; i < subset_props.length; i += 3) {
        const batch = subset_props.slice(i, i + 3);
        const results = await Promise.all(batch.map(prop => fetch_single_property(prop, difficulty)));
        pool.push(...results.flat());
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // bucket the pool by magnitude to make the game harder (i.e. dont have them compare a small number to a huge one)
    const buckets = pool.reduce((acc, item) => {
        const magnitude = Math.floor(Math.log10(item.value));
        if (!acc[magnitude]) acc[magnitude] = [];
        acc[magnitude].push(item);
        return acc;
    }, {});

    // filter out buckets that are too small. the final lineup will be 5 items but we want some extra in case some are discarded for being unsafe
    // buckets must also have a good variation of metrics
    const valid_buckets = Object.values(buckets).filter(bucket => {
        const unique_metrics = new Set(bucket.map(item => item.metric));
        return bucket.length >= 10 && unique_metrics.size >= 3;
    });

    if (valid_buckets.length === 0) {
        console.error("Didn't find any valid buckets, trying again...");
        return main();
    }

    // pick a random bucket and then pick 10 random items from that bucket to be checked for safety
    const chosen_bucket = valid_buckets[Math.floor(Math.random() * valid_buckets.length)];

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
        console.error("Not enough unique items in the chosen bucket, trying again...");
        return main();
    }

    const sorted_candidates = Array.from(unique_value_pool).sort((a, b) => a.value - b.value);

    // rather than selecting 10 random items, take the smallest, the largest, and fill with randoms in between to ensure spread
    const candidates = [
        sorted_candidates[0],
        sorted_candidates[sorted_candidates.length - 1],
        ...sorted_candidates.slice(1, sorted_candidates.length - 1).sort(() => 0.5 - Math.random()).slice(0, 8)
    ];

    // check candidates for safety and pick the first 5 safe ones for the game
    const safe_items = await check_if_safe(candidates);

    if (safe_items.length < 5) {
        console.error("Not enough safe items found, trying again...");
        return main();
    }

    // lastly sort the final items again and ensure still anchored with smallest and largest of new safe items in final lineup
    // this should be a lineup of 5
    const lineup = [
        safe_items[0],
        safe_items[safe_items.length - 1],
        ...safe_items.slice(1, safe_items.length - 1).sort(() => 0.5 - Math.random()).slice(0, 3)
    ].sort((a, b) => a.value - b.value);

    console.log("Today's lineup:");
    lineup.forEach(item => {
        console.log(`${item.name} (${item.metric}): ${item.prefix}${item.value}${item.suffix}`);
    });
}

main();
