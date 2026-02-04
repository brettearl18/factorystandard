// Guitar Specification Options
// These are the dropdown options for various spec fields

export const BODY_WOOD_OPTIONS = [
  // Bright / balanced
  "Alder",
  "Swamp Ash",
  "Northern Ash",
  "Olive Ash",
  "White Limba",
  "Black Limba",
  "Basswood", // used historically in some runs
  "Queensland Maple",
  "Sapele",
  // Warm / mahogany family
  "Brazilian Mahogany",
  "African Mahogany",
  "Pacific Mahogany",
  // Other body/top-cap combinations sometimes used as full bodies
  "Mango",
  "Koa",
  "Claro Walnut",
  "Redwood",
  "Redwood Burl",
  "Carbon Fibre",
  // Fallback
  "Other",
];

export const TOP_WOOD_OPTIONS = [
  // Maple family
  "Flame Maple",
  "Quilt Maple",
  "Spalted Maple",
  "Birdseye Maple",
  "Rock Maple",
  "Queensland Maple",
  // Exotics regularly used on GTR & Custom Shop
  "Poplar Burl",
  "Olive Ash",
  "Mango",
  "Claro Walnut",
  "Koa",
  "Ziricote",
  "Bois de Rose",
  "Goncalo Alves",
  "Redwood",
  "Redwood Burl",
  "Black Limba",
  "White Limba",
  "Ovangkol",
  "Pau Ferro",
  "Purpleheart",
  "Honduran Rosewood",
  "Brazilian Rosewood",
  "Indian Rosewood",
  "Sapele",
  "Snakewood",
  // Non-wood / hybrid
  "Carbon Fibre",
  // Graphic / composite tops (Goliath, Hype etc.)
  "Printed Graphic (Copper / Rust / etc.)",
  "Composite / Acrylic / Mixed Media",
  // Fallback
  "None",
  "Other",
];

export const NECK_WOOD_OPTIONS = [
  "Rock Maple",
  "Flame Maple",
  "Birdseye Maple",
  "Queensland Maple",
  "Wenge",
  "Purpleheart",
  "Black Limba",
  "White Limba",
  "Brazilian Mahogany",
  "African Mahogany",
  "Pacific Mahogany",
  "Sapele",
  "Padouk",
  "Ovangkol",
  "Osage Orange",
  "Pau Ferro",
  "Bois de Rose",
  "Mango",
  "Claro Walnut",
  "Ziricote",
  "Honduran Rosewood",
  "Indian Rosewood",
  "Brazilian Rosewood",
  "Carbon Fibre",
  // Common Ormsby multi-piece constructions – useful as presets
  "3-piece Maple",
  "3-piece Wenge",
  "5-piece Maple/Wenge",
  "Maple with Wenge Centre",
  "Maple with Padouk Centre",
  "Bubinga/Wenge Laminate",
  // Fallback
  "Other",
];

export const FRETBOARD_WOOD_OPTIONS = [
  // Very common Ormsby boards
  "Ebony",
  "Maple",
  "Rock Maple",
  "Roasted Maple",
  "Pale Moon Ebony",
  "Wenge",
  // From Ormsby tonewood list
  "Snakewood",
  "Padouk",
  "Bois de Rose",
  "Goncalo Alves",
  "Ovangkol",
  "Osage Orange",
  "Pau Ferro",
  "Purpleheart",
  "Mango",
  "Honduran Rosewood",
  "Brazilian Rosewood",
  "Indian Rosewood",
  "Ziricote",
  "Claro Walnut",
  "Carbon Fibre",
  // Synthetic
  "Richlite / Composite",
  // Fallback
  "Other",
];

// Legacy - kept for backward compatibility
export const ORMSBY_PICKUP_MODELS = [
  // Core GTR / Custom Shop humbuckers
  "Nunchucker (Bridge)",
  "Hot Rock (Bridge)",
  "Blizzard (Bridge)",
  "Concordia (Neck)",
  "De La Creme (Neck)",
  "PVH (Neck)",
  "PVH (Bridge)",
  "Old School (Neck)",
  // Additional Custom Shop & London Series
  "World's End (Bridge)",
  "World's End (Neck)",
  "Master Blaster (Bridge)",
  "Hybrid (Neck)",
  "Hybrid+ (Bridge)",
  "Katana (Bridge)",
  "Toe Cutter (Bridge)",
  "Cundalini (Neck)",
  "Chuggernaut (Bridge)", // London Series
  // Single coils seen on TX / Genesis / etc.
  "Apex Single Coil",
  "Old School Single Coil",
  // Fallback
  "Other Ormsby",
  "Non-Ormsby",
];

// Separated pickup options
export const PICKUP_NECK_OPTIONS = [
  "Concordia (Neck)",
  "De La Creme (Neck)",
  "PVH (Neck)",
  "Old School (Neck)",
  "World's End (Neck)",
  "Hybrid (Neck)",
  "Cundalini (Neck)",
  "Apex Single Coil",
  "Old School Single Coil",
  "Other Ormsby",
  "Non-Ormsby",
];

export const PICKUP_BRIDGE_OPTIONS = [
  "Nunchucker (Bridge)",
  "Hot Rock (Bridge)",
  "Blizzard (Bridge)",
  "PVH (Bridge)",
  "World's End (Bridge)",
  "Master Blaster (Bridge)",
  "Hybrid+ (Bridge)",
  "Katana (Bridge)",
  "Toe Cutter (Bridge)",
  "Chuggernaut (Bridge)",
  "Apex Single Coil",
  "Old School Single Coil",
  "Other Ormsby",
  "Non-Ormsby",
];

export const PICKUP_CONFIGURATION_OPTIONS = [
  "H-H",
  "H-S",
  "S-H",
  "H-S-S",
  "S-S-H",
  "S-S-S",
  "H (bridge only)",
  "S (neck only)",
  "P90 / H mix",
  "Other",
];

export const CONTROLS_OPTIONS = [
  "1 x Volume",
  "1 x Tone",
  "Volume + Tone",
  "Volume + Tone (Push/Pull Coil Split)",
  "Volume (Push/Pull Coil Split)",
  "Volume + Tone (Push/Pull Phase / Series-Parallel)",
  "Master Volume + Master Tone",
  "Kill Switch",
  "No Tone Control",
  "Other",
];

export const SWITCH_OPTIONS = [
  "3-way Toggle",
  "3-way Blade",
  "5-way Blade",
  "5-way Super Switch",
  "Mini Toggle (coil split)",
  "Mini Toggle (kill / mute)",
  "No Selector (single pickup)",
  "Other",
];

export const BRIDGE_OPTIONS = [
  // Ormsby designs
  "Ormsby Custom Multiscale Hardtail",
  "Ormsby Custom Standard-Scale Hardtail",
  "Ormsby Headless Multiscale Bridge",
  "Ormsby Multiscale Tremolo",
  // Third-party commonly used
  "Hipshot Fixed Bridge",
  "Hipshot Single-String / Headless",
  "Floyd Rose Original",
  "Floyd Rose 1000 Series",
  "Floyd Rose Special",
  "2-Point Tremolo",
  "Evertune",
  // High-level buckets (handy for filters)
  "Hardtail",
  "Non-Locking Tremolo",
  "Locking Tremolo",
  "Headless",
  "Other",
];

export const TUNER_OPTIONS = [
  "Ormsby Locking Tuners",
  "Ormsby Non-Locking Tuners",
  "Hipshot Locking Tuners",
  "Hipshot Open-Gear",
  "Headless Locking Units",
  "Other",
];

export const NUT_OPTIONS = [
  "GraphTech / Synthetic",
  "Bone",
  "Brass",
  "Locking Nut (Floyd Rose style)",
  "Multiscale Locking Nut",
  "Zero Fret",
  "Other",
];

export const PICKGUARD_OPTIONS = [
  "None",
  "1-ply Black",
  "1-ply White",
  "3-ply Black/White/Black",
  "3-ply White/Black/White",
  "Pearloid (White)",
  "Pearloid (Black)",
  "Transparent / Clear",
  "Custom Shape / Material",
  "Other",
];

export const STRING_COUNT_OPTIONS = ["6", "7", "8"];

export const STRING_GAUGE_OPTIONS = [
  "6-string: 9-42",
  "6-string: 10-46",
  "6-string: 11-49",
  "6-string: 11-52 (Drop)",
  "7-string: 10-59",
  "7-string: 10-62",
  "8-string: 10-74",
  "Custom",
];

export const SCALE_LENGTH_OPTIONS = [
  // Standard
  '25.5"',
  '24.75"', // rare but safe to include
  // Baritone
  '26.2"',
  '27"',
  '27.5"',
  // Multiscale sets
  '25.5"–27.5"',
  '25.5"–27.8"',
  '25.5"–28.2"',
  '26.2"–28.3"',
  // Headless / short or special may be added later
  "Custom",
];

export const ACTION_OPTIONS = [
  "Factory Low",
  "Medium",
  "High",
  "Custom Spec",
];

export const FINISH_TYPE_OPTIONS = [
  "Polyurethane – High Gloss",
  "Polyurethane – Satin",
  "Polyurethane – Open Pore Satin",
  "Polyurethane – Mixed Gloss/Satin",
  "Oil Finish (usually neck)",
  "Matte / Open Grain",
  "Crackle / Relic Effect",
  "Stain Only (oiled / waxed)",
  "Graphic / Print",
  "Other",
];

export const BINDING_OPTIONS = [
  "None",
  "Body – White",
  "Body – Black",
  "Body – Cream / Ivoroid",
  "Neck – White",
  "Neck – Black",
  "Neck – Cream / Ivoroid",
  "Headstock Matching Binding",
  "Body + Neck Matching Binding",
  "Other",
];

export const INLAY_STYLE_OPTIONS = [
  "None",
  "Dots",
  "Offset Dots",
  "Blocks",
  "Z-Pattern Dots",
  "Shark Fins",
  "Rings / Ovals",
  "Logo Only (12th fret)",
  "Custom Pattern",
];

export const INLAY_MATERIAL_OPTIONS = [
  // Shells (per Ormsby Inlays page – MOP/abalone family)
  "Mother of Pearl",
  "Abalone",
  "Black Pearl",
  // Other material families they regularly mention
  "Wood",
  "Stone / Semi-Precious",
  "Metal / Alloy",
  "Acrylic / Synthetic",
  "Luminlay / Glow",
  "Other",
];

export const FRET_COUNT_OPTIONS = ["22", "24", "27"];

export const FRET_SPEC_OPTIONS = [
  "Jumbo Stainless Steel",
  "Medium Jumbo Stainless Steel",
  "Nickel Silver",
  "Partially Scalloped (upper frets)",
  "Custom",
];

export const NECK_PROFILE_OPTIONS = [
  "Modern D",
  "Revised D",
  "Thin U",
  "C Shape",
  "Slim C",
  "Asymmetric",
  "Flat D (Shred)",
  "Custom",
];

export const RADIUS_OPTIONS = [
  '16"', // Ormsby standard across most GTR runs
  '14"',
  '12"',
  "Compound 12\"–16\"",
  "Custom",
];

export const HANDEDNESS_OPTIONS = [
  "Right Handed",
  "Left Handed",
];

// Placeholder arrays for other spec fields (to be populated later)
export const FINISH_COLOR_OPTIONS: string[] = [];

/** All run spec categories with key, label, and default options. Used by Admin Run Specs and run create/edit. */
export const SPEC_CATEGORIES = [
  { key: "bodyWood" as const, label: "Body Wood", options: BODY_WOOD_OPTIONS },
  { key: "topWood" as const, label: "Top Wood", options: TOP_WOOD_OPTIONS },
  { key: "neckWood" as const, label: "Neck Wood", options: NECK_WOOD_OPTIONS },
  { key: "fretboardWood" as const, label: "Fretboard Wood", options: FRETBOARD_WOOD_OPTIONS },
  { key: "pickupNeck" as const, label: "Neck Pickup", options: PICKUP_NECK_OPTIONS },
  { key: "pickupBridge" as const, label: "Bridge Pickup", options: PICKUP_BRIDGE_OPTIONS },
  { key: "pickupConfiguration" as const, label: "Pickup Configuration", options: PICKUP_CONFIGURATION_OPTIONS },
  { key: "controls" as const, label: "Controls", options: CONTROLS_OPTIONS },
  { key: "switch" as const, label: "Switch", options: SWITCH_OPTIONS },
  { key: "bridge" as const, label: "Bridge", options: BRIDGE_OPTIONS },
  { key: "tuners" as const, label: "Tuners", options: TUNER_OPTIONS },
  { key: "nut" as const, label: "Nut", options: NUT_OPTIONS },
  { key: "pickguard" as const, label: "Pickguard", options: PICKGUARD_OPTIONS },
  { key: "strings" as const, label: "String Count", options: STRING_COUNT_OPTIONS },
  { key: "stringGauge" as const, label: "String Gauge", options: STRING_GAUGE_OPTIONS },
  { key: "scaleLength" as const, label: "Scale Length", options: SCALE_LENGTH_OPTIONS },
  { key: "action" as const, label: "Action", options: ACTION_OPTIONS },
  { key: "finishType" as const, label: "Finish Type", options: FINISH_TYPE_OPTIONS },
  { key: "binding" as const, label: "Binding", options: BINDING_OPTIONS },
  { key: "inlays" as const, label: "Inlay Style", options: INLAY_STYLE_OPTIONS },
  { key: "frets" as const, label: "Fret Count", options: FRET_COUNT_OPTIONS },
  { key: "neckProfile" as const, label: "Neck Profile", options: NECK_PROFILE_OPTIONS },
  { key: "radius" as const, label: "Radius", options: RADIUS_OPTIONS },
  { key: "handedness" as const, label: "Handedness", options: HANDEDNESS_OPTIONS },
] as const;