# Guitar spec options (Factory Standards)

Reference generated from the app’s canonical option lists in **`src/constants/guitarSpecs.ts`**, aligned with **`GuitarSpecs`** and **`Run.specConstraints`** in **`src/types/guitars.ts`**.

Use this when filling **`CUSTOM_SHOP_ORDER_FORM_TEMPLATE.md`**: labels below should match Firestore/UI if you reuse the same spec keys.

---

## Spec field keys (`GuitarSpecs` / run constraints)

| Key | Human label (app) |
|-----|-------------------|
| `bodyWood` | Body Wood |
| `topWood` | Top Wood |
| `neckWood` | Neck Wood |
| `fretboardWood` | Fretboard Wood |
| `pickupNeck` | Neck Pickup |
| `pickupBridge` | Bridge Pickup |
| `pickupConfiguration` | Pickup Configuration |
| `controls` | Controls |
| `switch` | Switch |
| `bridge` | Bridge |
| `tuners` | Tuners |
| `nut` | Nut |
| `pickguard` | Pickguard |
| `strings` | String Count |
| `stringGauge` | String Gauge |
| `scaleLength` | Scale Length |
| `action` | Action |
| `finishType` | Finish Type |
| `binding` | Binding |
| `inlays` | Inlay Style |
| `frets` | Fret Count |
| `neckProfile` | Neck Profile |
| `radius` | Radius |
| `handedness` | Handedness |

**Also on `GuitarSpecs` in types (free text / not in `SPEC_CATEGORIES`):**

| Key | Notes |
|-----|--------|
| `finishColor` | No fixed option list in code yet (`FINISH_COLOR_OPTIONS` is empty). |
| `pickups` | Legacy single field; prefer `pickupNeck` + `pickupBridge`. |
| `customNotes` | Free text. |

**Extra arrays in `guitarSpecs.ts` (not in admin run `SPEC_CATEGORIES` list):**

- `INLAY_MATERIAL_OPTIONS` — use if you split inlay material from style.
- `FRET_SPEC_OPTIONS` — fret wire / material style (separate from fret count).
- `ORMSBY_PICKUP_MODELS` — legacy combined neck+bridge list.

---

## Options by category

### Body Wood (`bodyWood`)

- Alder  
- Swamp Ash  
- Northern Ash  
- Olive Ash  
- White Limba  
- Black Limba  
- Basswood  
- Queensland Maple  
- Sapele  
- Brazilian Mahogany  
- African Mahogany  
- Pacific Mahogany  
- Mango  
- Koa  
- Claro Walnut  
- Redwood  
- Redwood Burl  
- Carbon Fibre  
- Other  

---

### Top Wood (`topWood`)

- Flame Maple  
- Quilt Maple  
- Spalted Maple  
- Birdseye Maple  
- Rock Maple  
- Queensland Maple  
- Poplar Burl  
- Olive Ash  
- Mango  
- Claro Walnut  
- Koa  
- Ziricote  
- Bois de Rose  
- Goncalo Alves  
- Redwood  
- Redwood Burl  
- Black Limba  
- White Limba  
- Ovangkol  
- Pau Ferro  
- Purpleheart  
- Honduran Rosewood  
- Brazilian Rosewood  
- Indian Rosewood  
- Sapele  
- Snakewood  
- Carbon Fibre  
- Printed Graphic (Copper / Rust / etc.)  
- Composite / Acrylic / Mixed Media  
- None  
- Other  

---

### Neck Wood (`neckWood`)

- Rock Maple  
- Flame Maple  
- Birdseye Maple  
- Queensland Maple  
- Wenge  
- Purpleheart  
- Black Limba  
- White Limba  
- Brazilian Mahogany  
- African Mahogany  
- Pacific Mahogany  
- Sapele  
- Padouk  
- Ovangkol  
- Osage Orange  
- Pau Ferro  
- Bois de Rose  
- Mango  
- Claro Walnut  
- Ziricote  
- Honduran Rosewood  
- Indian Rosewood  
- Brazilian Rosewood  
- Carbon Fibre  
- 3-piece Maple  
- 3-piece Wenge  
- 5-piece Maple/Wenge  
- Maple with Wenge Centre  
- Maple with Padouk Centre  
- Bubinga/Wenge Laminate  
- Other  

---

### Fretboard Wood (`fretboardWood`)

- Ebony  
- Maple  
- Rock Maple  
- Roasted Maple  
- Pale Moon Ebony  
- Wenge  
- Snakewood  
- Padouk  
- Bois de Rose  
- Goncalo Alves  
- Ovangkol  
- Osage Orange  
- Pau Ferro  
- Purpleheart  
- Mango  
- Honduran Rosewood  
- Brazilian Rosewood  
- Indian Rosewood  
- Ziricote  
- Claro Walnut  
- Carbon Fibre  
- Richlite / Composite  
- Other  

---

### Neck Pickup (`pickupNeck`)

- Concordia (Neck)  
- De La Creme (Neck)  
- PVH (Neck)  
- Old School (Neck)  
- World's End (Neck)  
- Hybrid (Neck)  
- Cundalini (Neck)  
- Apex Single Coil  
- Old School Single Coil  
- Other Ormsby  
- Non-Ormsby  

---

### Bridge Pickup (`pickupBridge`)

- Nunchucker (Bridge)  
- Hot Rock (Bridge)  
- Blizzard (Bridge)  
- PVH (Bridge)  
- World's End (Bridge)  
- Master Blaster (Bridge)  
- Hybrid+ (Bridge)  
- Katana (Bridge)  
- Toe Cutter (Bridge)  
- Chuggernaut (Bridge)  
- Apex Single Coil  
- Old School Single Coil  
- Other Ormsby  
- Non-Ormsby  

---

### Pickup Configuration (`pickupConfiguration`)

- H-H  
- H-S  
- S-H  
- H-S-S  
- S-S-H  
- S-S-S  
- H (bridge only)  
- S (neck only)  
- P90 / H mix  
- Other  

---

### Controls (`controls`)

- 1 x Volume  
- 1 x Tone  
- Volume + Tone  
- Volume + Tone (Push/Pull Coil Split)  
- Volume (Push/Pull Coil Split)  
- Volume + Tone (Push/Pull Phase / Series-Parallel)  
- Master Volume + Master Tone  
- Kill Switch  
- No Tone Control  
- Other  

---

### Switch (`switch`)

- 3-way Toggle  
- 3-way Blade  
- 5-way Blade  
- 5-way Super Switch  
- Mini Toggle (coil split)  
- Mini Toggle (kill / mute)  
- No Selector (single pickup)  
- Other  

---

### Bridge (`bridge`)

- Ormsby Custom Multiscale Hardtail  
- Ormsby Custom Standard-Scale Hardtail  
- Ormsby Headless Multiscale Bridge  
- Ormsby Multiscale Tremolo  
- Hipshot Fixed Bridge  
- Hipshot Single-String / Headless  
- Floyd Rose Original  
- Floyd Rose 1000 Series  
- Floyd Rose Special  
- 2-Point Tremolo  
- Evertune  
- Hardtail  
- Non-Locking Tremolo  
- Locking Tremolo  
- Headless  
- Other  

---

### Tuners (`tuners`)

- Ormsby Locking Tuners  
- Ormsby Non-Locking Tuners  
- Hipshot Locking Tuners  
- Hipshot Open-Gear  
- Headless Locking Units  
- Other  

---

### Nut (`nut`)

- GraphTech / Synthetic  
- Bone  
- Brass  
- Locking Nut (Floyd Rose style)  
- Multiscale Locking Nut  
- Zero Fret  
- Other  

---

### Pickguard (`pickguard`)

- None  
- 1-ply Black  
- 1-ply White  
- 3-ply Black/White/Black  
- 3-ply White/Black/White  
- Pearloid (White)  
- Pearloid (Black)  
- Transparent / Clear  
- Custom Shape / Material  
- Other  

---

### String Count (`strings`)

- 6  
- 7  
- 8  

---

### String Gauge (`stringGauge`)

- 6-string: 9-42  
- 6-string: 10-46  
- 6-string: 11-49  
- 6-string: 11-52 (Drop)  
- 7-string: 10-59  
- 7-string: 10-62  
- 8-string: 10-74  
- Custom  

---

### Scale Length (`scaleLength`)

- 25.5"  
- 24.75"  
- 26.2"  
- 27"  
- 27.5"  
- 25.5"–27.5"  
- 25.5"–27.8"  
- 25.5"–28.2"  
- 26.2"–28.3"  
- Custom  

---

### Action (`action`)

- Factory Low  
- Medium  
- High  
- Custom Spec  

---

### Finish Type (`finishType`)

- Polyurethane – High Gloss  
- Polyurethane – Satin  
- Polyurethane – Open Pore Satin  
- Polyurethane – Mixed Gloss/Satin  
- Oil Finish (usually neck)  
- Matte / Open Grain  
- Crackle / Relic Effect  
- Stain Only (oiled / waxed)  
- Graphic / Print  
- Other  

---

### Binding (`binding`)

- None  
- Body – White  
- Body – Black  
- Body – Cream / Ivoroid  
- Neck – White  
- Neck – Black  
- Neck – Cream / Ivoroid  
- Headstock Matching Binding  
- Body + Neck Matching Binding  
- Other  

---

### Inlay Style (`inlays`)

- None  
- Dots  
- Offset Dots  
- Blocks  
- Z-Pattern Dots  
- Shark Fins  
- Rings / Ovals  
- Logo Only (12th fret)  
- Custom Pattern  

---

### Fret Count (`frets`)

- 22  
- 24  
- 27  

---

### Neck Profile (`neckProfile`)

- Modern D  
- Revised D  
- Thin U  
- C Shape  
- Slim C  
- Asymmetric  
- Flat D (Shred)  
- Custom  

---

### Radius (`radius`)

- 16"  
- 14"  
- 12"  
- Compound 12"–16"  
- Custom  

---

### Handedness (`handedness`)

- Right Handed  
- Left Handed  

---

## Supplementary lists (code only — not in `SPEC_CATEGORIES`)

### Inlay material (constant `INLAY_MATERIAL_OPTIONS`)

- Mother of Pearl  
- Abalone  
- Black Pearl  
- Wood  
- Stone / Semi-Precious  
- Metal / Alloy  
- Acrylic / Synthetic  
- Luminlay / Glow  
- Other  

### Fret spec / wire (constant `FRET_SPEC_OPTIONS`)

- Jumbo Stainless Steel  
- Medium Jumbo Stainless Steel  
- Nickel Silver  
- Partially Scalloped (upper frets)  
- Custom  

### Legacy combined pickups (constant `ORMSBY_PICKUP_MODELS`)

- Nunchucker (Bridge)  
- Hot Rock (Bridge)  
- Blizzard (Bridge)  
- Concordia (Neck)  
- De La Creme (Neck)  
- PVH (Neck)  
- PVH (Bridge)  
- Old School (Neck)  
- World's End (Bridge)  
- World's End (Neck)  
- Master Blaster (Bridge)  
- Hybrid (Neck)  
- Hybrid+ (Bridge)  
- Katana (Bridge)  
- Toe Cutter (Bridge)  
- Chuggernaut (Bridge)  
- Cundalini (Neck)  
- Apex Single Coil  
- Old School Single Coil  
- Other Ormsby  
- Non-Ormsby  

---

## Maintenance

When options change in **`src/constants/guitarSpecs.ts`**, update this file (or regenerate from code) so Custom Shop templates and pricing tables stay in sync.
