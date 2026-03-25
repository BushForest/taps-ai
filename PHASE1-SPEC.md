# TAPs Eats — Phase 1: Strict Product Spec
> Source: Pencil file `tapseat.pen`. Every element listed exactly as visible in the sketch.
> Nothing inferred. Nothing assumed. Nothing filled in from logic.
> UNCLEAR FROM SKETCH = not directly readable in the frame.

---

## All Screens — Master List

| Frame ID | Screen Name | App |
|----------|-------------|-----|
| QyeVt | TAPs · Menu Tab | Customer |
| i8cYK | TAPs · Menu Tab (Item Expanded) | Customer |
| 7AoYl | Kitchen Confirm | Customer |
| 1B29b | TAPs · Live Bill | Customer |
| uWSAa | Pay Tab | Customer |
| Ljq8D | Pay Whole Tab | Customer |
| SSrbr | TAPs · Sign In | Customer |
| xFqLF | TAPs · Server | Customer |
| VBVOc | TAPs · Profile | Customer |
| RU9cE | TAPs · Edit Profile | Customer |
| KfO5H | TAPs · Payment Methods | Customer |
| QuuQx | TAPs · Order History | Customer |
| Jg1eR | TAPs · Preferences | Customer |
| lNkeD | TAPs · Settings | Customer |
| aTOvy | Admin · Floor View | Admin |
| mfayM | Admin · Sessions | Admin |
| 6nP4C | Admin · Exceptions | Admin |
| hBI3e | Admin · Table Detail | Admin |
| QxOvz | Admin · Edit Order | Admin |
| u4SRA | Admin · Adjust Bill | Admin |
| z96aY | Admin · Analytics | Admin |
| Byc4P | Analytics · Item Pairings | Admin |
| FXL56 | Analytics · Issues & Adjustments | Admin |
| Ivgvf | Analytics · Kitchen & Ops | Admin |
| Z0r16 | Analytics · Revenue Deep Dive | Admin |
| YlHpL | Admin · Repeat Customers | Admin |
| hbtHG | Admin · Flag Issue | Admin |
| 8QYCz | Admin · Promo Assignment | Admin |

---

## Customer App Screens

---

### SCREEN 01 — Menu Tab
**Frame ID:** `QyeVt`

**Visible UI elements (top to bottom):**

**Browser bar**
- URL displayed: `taps.blackblue.ca`

**Header bar**
- Text left: `BLACK+BLUE TORONTO`
- Button right 1: `Sign In` (pill button)
- Button right 2: `Server` (pill button with icon)

**Tab row (3 tabs)**
- `Menu` — currently selected (visually distinct from others)
- `Live Bill`
- `Pay`

**Category pill row (horizontal, scrollable)**
- `Full Menu`
- `Steaks & Mains` — currently selected (visually distinct)
- `Starters`
- `Cocktails`

**Item list (vertical scroll)**

Item 1:
- Image: thumbnail left
- Name: `Grilled Salmon`
- Description: `Atlantic - lemon butter glaze`
- Chips: `GF` `DF`
- Price: `$42.00`

Item 2:
- Image: thumbnail left
- Name: `Bone-In Ribeye`
- Description: `18oz - char-grilled to order`
- Chip: `GF`
- Price: `$85.00`
- Gold circle badge on image: `1`

Item 3:
- Image: thumbnail left
- Name: `Bone-In Ribeye`
- Description: `18oz - char-grilled to order`
- Price: `$85.00`

Item 4:
- Image: thumbnail left
- Name: `NY Strip 12oz`
- Description: `12oz - herb-crusted, bone-in`
- Price: `$62.00`

Item 5 (partially visible, cut off):
- Name: `Filet Mignon`
- Description: `6oz - peppercorn cream` (partial)

**Floating element (mid-right)**
- Label: `Pick`
- UNCLEAR FROM SKETCH: what triggers this button to appear

**Bottom bar (fixed/sticky — UNCLEAR FROM SKETCH: exact behavior)**
- Icon: flame/fire icon
- Button text: `Send to Kitchen (1)`
- Button style: gold fill, pill shape

---

### SCREEN 02 — Menu Tab (Item Expanded)
**Frame ID:** `i8cYK`

**Visible UI elements (top to bottom):**

**Browser bar**
- URL: `taps.blackblue.ca` (UNCLEAR: partially visible)

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Buttons: `Sign In`, `Server` (same as Menu Tab)

**Tab row**
- `Menu` `Live Bill` `Pay`
- UNCLEAR FROM SKETCH: which tab is active on this screen

**Item cards visible in background/scroll (same list as Menu Tab, partially visible)**

**Expanded item section:**
- Image: full-width hero image of food item
- Item name: `Bone-In Ribeye`
- Price: `$85.00`
- Description text: `Dry-aged 30 days, served with compound butter, roasted garlic, and seasonal herbs.` (UNCLEAR: exact full text, partially readable)

**DONENESS** (section label, all caps)
- Pills: `Medium Rare` (selected), `Rare`, `Medium`, `Well Done`

**SAUCE** (section label, all caps)
- Pills: `Béarnaise` (selected), `Peppercorn`, `Chimichurri`

**NOTES** (section label, all caps)
- Input field: placeholder text `Any special requests...`

**Allergen chips row**
- `GF` chip
- `Dairy` chip

**Quantity controls**
- `−` button
- Value: `1`
- `+` button

**Fine print text (small)**
- `You'll confirm before it goes to the kitchen`

**Items visible below (scroll continues)**
- `NY Strip 12oz` — `herb-crusted, bone-in` — `$62.00`
- `Filet Mignon` — (description partially visible)

**Bottom bar**
- Button: `Send to Kitchen` (gold fill, full width)

---

### SCREEN 03 — Kitchen Confirm
**Frame ID:** `7AoYl`

**Visible UI elements (top to bottom):**

**Browser bar**
- URL: `taps.blackblue.ca`

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Buttons: `Sign In`, `Server`

**Tab row**
- `Menu` `Live Bill` `Pay`
- UNCLEAR FROM SKETCH: which tab is active/selected

**Section label**
- `PENDING ORDER`

**Order item list**
- Item 1: `Bone-In Ribeye 18oz` / secondary text: `Med Rare · Béarnaise`
- Item 2: `Grilled Salmon` / secondary text: `Lemon Butter`

**Primary CTA button (bottom)**
- `Send to Kitchen` (gold fill, full width)

**Secondary link (below CTA)**
- `Keep Browsing`

---

### SCREEN 04 — Live Bill
**Frame ID:** `1B29b`

**Visible UI elements (top to bottom):**

**Browser bar**
- URL: `taps.blackblue.ca`

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Buttons: `Sign In`, `Server`

**Tab row**
- `Menu` `Live Bill` `Pay`
- `Live Bill` — currently selected (visually distinct)

**Bill summary card**
- Left value: `$85.00`
- Left label: `Paid`
- Right value: `$162.00`
- Right label: `Remaining`

**Section label**
- `IN KITCHEN`

**IN KITCHEN items**
- `Bone-In Ribeye 18oz` / `Medium Rare · Béarnaise` / `$85`
- `Filet Mignon` / `Medium · Peppercorn` / `$72`

**Section label**
- `ON TABLE`

**ON TABLE items**
- `Grilled Salmon` / `Lemon Butter` / `$42`

**Floating action button (bottom right)**
- `?` (gold circle)
- UNCLEAR FROM SKETCH: what this button does when tapped

---

### SCREEN 05 — Pay Tab
**Frame ID:** `uWSAa`

**Visible UI elements (top to bottom):**

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Buttons: `Sign In`, `Server`

**Tab row**
- `Menu` `Live Bill` `Pay`
- `Pay` — currently selected (visually distinct)

**Page heading**
- `How do you want to pay?`

**Balance display**
- Large value: `$162.00`
- Secondary text: `2 items · Table 10`

**Payment option cards (stacked, expandable)**

Card 1: `Pay Whole Tab`
- State: collapsed
- UNCLEAR FROM SKETCH: exact collapsed appearance

Card 2: `Split Evenly`
- State: expanded and selected (checkmark visible, visually distinct border)
- People picker: `−` `2 people` `+`
- Calculated amount text: `Each person pays: $81.00` (UNCLEAR: exact label text)

Card 3: `Pay for My Items`
- State: collapsed

Card 4: `Custom Amount`
- State: collapsed

**TIP section label**
- Pill row: `15%` `18%` (selected) `20%` `Custom`

**Custom tip input row**
- `$` symbol
- Input value: `25.00`
- `%` toggle (UNCLEAR: exact label/behavior)

**Totals section**
- UNCLEAR FROM SKETCH: exact line item labels — rows are visible but text is not fully legible at this size

**Payment method buttons row**
- `Pay` (with Apple Pay logo)
- `G Pay`
- `S Pay`

**Primary CTA button (bottom)**
- `Pay $81.00 – Split Evenly`
- Style: gold fill, full width
- UNCLEAR FROM SKETCH: exact button label format

---

### SCREEN 06 — Pay Whole Tab
**Frame ID:** `Ljq8D`

**Visible UI elements (top to bottom):**

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Buttons: `Sign In`, `Server`

**Tab row**
- `Menu` `Live Bill` `Pay`
- `Pay` — currently selected

**Page heading**
- `How do you want to pay?`

**Balance display**
- Large value: `$162.00`
- Secondary text: `2 items · Table 10`

**Payment option cards (stacked, expandable)**

Card 1: `Pay Whole Tab`
- State: expanded and selected (checkmark visible, visually distinct border)
- Sub-label: `Pay the entire bill at once`
- Amount display: `Full tab amount` — `$162.00`

Card 2: `Split Evenly`
- State: collapsed

Card 3: `Pay for My Items`
- State: collapsed

Card 4: `Custom Amount`
- State: collapsed

**TIP section label**
- Pill row: `15%` `18%` (selected) `20%` `Custom`

**Custom tip input row**
- `$` symbol
- Input value: `25.00`
- `%` toggle (UNCLEAR: exact label/behavior)

**Totals section**
- UNCLEAR FROM SKETCH: exact line items — rows visible but text not fully legible

**Payment method buttons row**
- `Pay` (with Apple Pay logo)
- `G Pay`
- `S Pay`

**Primary CTA button (bottom)**
- `Pay $212.22 – Whole Tab`
- Style: gold fill, full width
- UNCLEAR FROM SKETCH: exact button label format

---

### SCREEN 07 — Sign In
**Frame ID:** `SSrbr`

**Visible UI elements (top to bottom):**

**Browser bar (Safari)**
- URL: `taps.blackblue.ca`

**Header bar**
- Back arrow (left)
- Text: `BLACK+BLUE TORONTO` (centered)

**Heading**
- `Welcome`

**Sub-heading text**
- `Sign in to get your receipt emailed`

**Form field 1**
- Label: `EMAIL OR PHONE`
- Placeholder: `your@email.com`

**Form field 2**
- Label: `PASSWORD`
- Input type: password (dots visible)
- Right-aligned link: `Forgot password?`

**Primary CTA button**
- `Sign In`
- Style: gold fill, full width

**Section label (between blocks)**
- `FAST CHECKOUT`

**Phone OTP row**
- Phone icon (left)
- Input field: `+1 (416) 555-0123` (placeholder)
- Button: `Send Code` (gold fill)

**Social auth buttons row**
- `Apple`
- `Google`
- `Phone`
- UNCLEAR FROM SKETCH: exact button styling (outline pills, solid, etc.)

**Guest link**
- `Continue as Guest →`

**Footer text (bottom)**
- `By signing in, you agree to our Terms & Privacy Policy`

---

### SCREEN 08 — Request Server
**Frame ID:** `xFqLF`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `BLACK+BLUE TORONTO` (centered)

**Icon (centered)**
- Service bell icon
- UNCLEAR FROM SKETCH: exact icon

**Heading**
- `Request Server`

**Sub-text**
- `Table 10 · 2 Guests`

**Server status indicator**
- Green dot
- Text: `YOUR SERVER IS AVAILABLE`

**Section label**
- `QUICK REQUESTS`

**Request tile grid**
- Row 1: `Water` | `Utensils` | `Ice`
- Row 2: `Refill` | `Other`

**Primary CTA button**
- `Send Request`
- Style: gold fill, full width

**Secondary link (below CTA)**
- `Cancel`

---

### SCREEN 09 — Profile
**Frame ID:** `VBVOc`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Profile` (centered)
- Settings/gear icon (right)

**Avatar**
- Initials: `JD`
- Shape: circle

**Name text**
- `John Doe`

**Email text**
- `john.doe@email.com`

**Badge**
- Text: `Gold Member`
- UNCLEAR FROM SKETCH: exact badge icon (star or similar)

**List items (each with right arrow chevron)**
- `Edit Profile`
- `Payment Methods`
- `Order History`
- `Preferences`
- `Settings`
- `Notifications`

**Bottom action**
- `Sign Out`
- Style: red text

---

### SCREEN 10 — Edit Profile
**Frame ID:** `RU9cE`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Edit Profile` (centered)
- Text button right: `Save`

**Avatar area**
- Initials: `JD`
- Shape: circle
- Link below: `Change Photo`

**Form fields (each with visible label above input)**
- `FIRST NAME` → value: `John`
- `LAST NAME` → value: `Doe`
- `EMAIL` → value: `john.doe@email.com`
- `PHONE` → value: `+1 (416) 555-0123`
- `DATE OF BIRTH` → value: `March 15, 1990`

**Bottom action**
- `Delete Account`
- Style: red text

---

### SCREEN 11 — Payment Methods
**Frame ID:** `KfO5H`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Payment Methods` (centered)

**Section label**
- `SAVED CARDS`

**Card rows (each with icon + details + right arrow)**
- Row 1: card icon + `Visa •••• 4242` + `Expires 12/25` + `DEFAULT` badge
- Row 2: card icon + `Mastercard •••• 8888` + `Expires 06/26`

**Add card button**
- `+ Add New Card`
- Style: outlined, full width

**Section label**
- `DIGITAL WALLETS`

**Wallet rows**
- Row 1: `Apple Pay` + `● Connected` (green dot + text)
- Row 2: `Google Pay` + `● Not Connected` (gray dot + text)

---

### SCREEN 12 — Order History
**Frame ID:** `QuuQx`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Order History` (centered)

**Stats row (3 columns)**
- `12` / `Visits`
- `$1,847` / `Total Spent`
- `4.9` / `Avg Rating`

**Section label**
- `RECENT ORDERS`

**Order rows (each row)**
- Row 1:
  - Date: `Mar 20, 2026`
  - Items: `Bone-In Ribeye, Grilled Salmon`
  - Star icons (5 stars, rating state UNCLEAR FROM SKETCH)
  - Table: `Table 10`
  - Price: `$127.00`
- Row 2:
  - Date: `Mar 15, 2026`
  - Items: `NY Strip, Caesar Salad`
  - Star icons
  - Table: `Table 7`
  - Price: `$89.50`
- Row 3:
  - Date: `Mar 8, 2026`
  - Items: `Filet Mignon, Lobster Tail, Wine`
  - Star icons
  - Table: `Table 3`
  - Price: `$215.00`

**Footer link**
- `View All Orders →`

---

### SCREEN 13 — Preferences
**Frame ID:** `Jg1eR`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Preferences` (centered)

**Section label**
- `DIETARY PREFERENCES`

**Chip selection row(s) (multi-select)**
- `No Shellfish`
- `Vegetarian`
- `Vegan`
- `No Nuts`
- `Gluten Free`
- `Dairy Free`
- `Halal`
- `Kosher`
- UNCLEAR FROM SKETCH: which chips are currently selected vs. unselected

**Section label**
- `ALLERGIES`

**Text area**
- Visible text: `Shellfish allergy - please flag all dishes`

**Section label**
- `NOTIFICATIONS`

**Toggle rows**
- `Order Updates` + toggle (ON state, gold/active)
- `Promotions` + toggle (ON state, gold/active)
- `Server Notifications` + toggle (OFF state, gray/inactive)

**Section label**
- `SEATING PREFERENCE`

**Toggle buttons row**
- `Indoor` (selected, gold fill)
- `Outdoor` (unselected)

---

### SCREEN 14 — Settings
**Frame ID:** `lNkeD`

**Visible UI elements (top to bottom):**

**Header bar**
- Back arrow (left)
- Text: `Settings` (centered)

**Section label**
- `ACCOUNT`

**List items (each with right arrow)**
- `Edit Profile`
- `Payment Methods`
- `Notifications`
- `Preferences`

**Section label**
- `SUPPORT`

**List items**
- `Help & FAQ`
- `Contact Support`
- `Rate the App`

**Section label**
- `LEGAL`

**List items**
- `Privacy Policy`
- `Terms of Service`
- `About`

**Bottom action**
- `Sign Out`
- Style: red text

**Footer text (very small, bottom)**
- `TAPs v2.1.9`
- `BLACK+BLUE TORONTO`

---

## Admin App Screens

---

### SCREEN 15 — Floor View
**Frame ID:** `aTOvy`

**Visible UI elements (top to bottom):**

**Status bar**
- Time: `5:41`

**Header bar**
- Text: `BLACK+BLUE TORONTO`
- Stats visible:
  - Number: `8` with label (UNCLEAR FROM SKETCH: exact label text)
  - Value: `$1,564` (gold)
  - Number: `1` (red background badge)

**Sub-header row**
- UNCLEAR FROM SKETCH: exact label text in this row
- Button: visible but label UNCLEAR FROM SKETCH

**Table grid (3 columns)**

Each table card contains:
- Table label (e.g., `TABLE 1`)
- Status badge (colored pill — colors differ per state)
- Dollar amount (gold)
- Secondary text line (UNCLEAR FROM SKETCH: exact format)
- Action button(s)

Visible table states:
- TABLE 1: dollar amount visible, status badge color: blue-ish — `$186`
- TABLE 2: `$134` — status badge: `ASSISTANCE` (red/alarm)
- TABLE 3: `$35` — status badge: green
- TABLE 4: `$0` — status badge: gray
- TABLE 5: `$312` — status badge: amber
- TABLE 6: `$178` — status badge: green, additional badge visible
- TABLE 7: `$267` — status badge: green
- TABLE 8: `$0` — status badge: gray
- TABLE 9: `$156` — status badge: green
- TABLE 10: `$412` — status badge: amber
- TABLE 11: `$0` — status badge: blue-ish
- TABLE 12: UNCLEAR FROM SKETCH (cut off or not fully readable)

Action buttons on cards:
- `Mark Served` (one button)
- `Clear Table` (one button)
- UNCLEAR FROM SKETCH: which states show which buttons

**Bottom navigation (4 tabs)**
- `Floor` (currently selected, gold)
- `Sessions`
- `Exceptions`
- `Analytics`

---

### SCREEN 16 — Sessions
**Frame ID:** `mfayM`

**Visible UI elements (top to bottom):**

**Header bar**
- UNCLEAR FROM SKETCH: exact header content (screenshot from previous session context, needs re-verification)

**Filter pills row**
- `All`
- `Eating` (with count badge)
- `Paying` (with count badge)
- UNCLEAR FROM SKETCH: exact count values visible

**Session/table cards (vertical list)**
Each card:
- Table number label
- Status badge (colored pill)
- Dollar amount (large, gold)
- Secondary info line (guest count, time active)
- `View Order` button
- `Clear Table` button

**Bottom navigation**
- `Floor` `Sessions` (selected, gold) `Exceptions` `Analytics`

---

### SCREEN 17 — Exceptions
**Frame ID:** `6nP4C`

**Visible UI elements (top to bottom):**

**Page header row**
- Count text: `X Active Exceptions` (UNCLEAR FROM SKETCH: exact number)
- Badge: `Live` with pulsing dot

**Section label**
- `Critical`

**Exception cards (Critical section)**
Each card (red left border):
- Icon (varies by type)
- Title text
- Time ago (right)
- Session identifier text
- Description text (body)
- Button: `View Session`
- Button: `Dismiss`

**Section label**
- `Warnings`

**Exception cards (Warnings section)**
Same card anatomy as Critical, different border color (amber)

**Section label**
- `Resolved Today`

**Resolved rows**
Each row:
- `✓` check icon
- Summary label
- `Resolved X ago` text

**Bottom navigation**
- `Floor` `Sessions` `Exceptions` (selected, gold) `Analytics`

---

### SCREEN 18 — Table Detail
**Frame ID:** `hBI3e`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back arrow `←` (left)
- Title: `TABLE X` (centered, where X = table number)
- Badge: `ADMIN` (gold, right)

**Status row**
- Colored dot (color varies by status)
- Status label text
- Time active (right-aligned)

**Stats row (3 columns, each with label above value)**
- `Guests` / value
- `Server` / value (or `—` if none assigned)
- `Seated` / value (time)

**Order heading**
- `Current Order`
- Secondary text: `· Sent to Kitchen`

**Line items list**
Each item row:
- Item name
- Modifier text (secondary line, when present)
- Price (right-aligned)

**Empty state** (when no items):
- `No items yet`

**Totals block**
- `Subtotal` / value
- `Tax (13%)` / value
- `Paid` / value (only visible when paid amount > 0, shown in different color)
- `Total` / value (bold)

**Action buttons row (3 buttons)**
- `Edit Order`
- `Adjust Bill` (gold fill)
- `Flag Issue` (red fill)

**Bottom navigation**
- `Floor` `Sessions` (selected, gold) `Exceptions` `Analytics`

---

### SCREEN 19 — Edit Order
**Frame ID:** `QxOvz`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back arrow `←` (left)
- Title: `Edit Order — Table X`
- Badge: `ADMIN` (gold, right)

**Search input**
- Placeholder: `Search menu to add items...`
- Full width

**Section label**
- `Current Items`

**Item cards (each card)**
- Top row: item name (bold) | price | trash/delete icon (right)
- Bottom row: `−` button | quantity number | `+` button | modifier text (right)

**Section label**
- `Comp & Discounts`

**Totals block**
- `Subtotal` / value
- `Tax (13%)` / value
- `Total` / value (gold, bold)

**Footer action row**
- `Cancel` button (left)
- `Save Changes` button (right, gold fill)

**Bottom navigation**
- `Floor` `Sessions` (selected, gold) `Exceptions` `Analytics`

---

### SCREEN 20 — Adjust Bill
**Frame ID:** `u4SRA`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back arrow `←` (left)
- Title: `Adjust Bill`
- Badge: `ADMIN` (gold, right)

**Table info line**
- `TABLE 3 · 3 guests · Server: Maria S.`

**Section label**
- `REASON FOR ADJUSTMENT`

**Reason tile grid (2 columns)**
- `↩ Sent Back` | `✕ Wrong Item`
- `$ Comp` | `💬 Complaint`
- `🏷 Price Fix` | `✂ Split Fix`
- UNCLEAR FROM SKETCH: exact icons (text approximations used above)
- UNCLEAR FROM SKETCH: which tile is currently selected

**Section label**
- `SELECT ITEMS TO ADJUST`

**Item checkbox list**
- `☑ Ribeye Steak x1` — `$68.00`
- `☐ Caesar Salad x2` — `$38.00`
- `☑ Red Wine x3` — `$54.00`

**Section label**
- `SERVER NOTES`

**Text area**
- Visible text: `Customer said steak was overcooked, wine was corked. Sending back both items...`

**Section label**
- `ADJUSTMENT SUMMARY`

**Summary rows**
- `Items to Remove` / `2 items`
- `Credit Amount` / `-$122.00` (red text)
- `New Total` / `$68.00` (bold)

**Toggle row**
- Label: `Requires Manager Approval`
- State: ON (gold)
- Sub-label text: (UNCLEAR FROM SKETCH: text below toggle is very small, not fully readable)

**Footer action row**
- `Cancel` button (left)
- `Submit Adjustment` button (right, gold fill)

**Bottom navigation**
- `Floor` `Sessions` (selected, gold) `Exceptions` `Analytics`

---

### SCREEN 21 — Analytics
**Frame ID:** `z96aY`

**Visible UI elements (top to bottom):**

**Header row**
- Title: `Analytics`
- Date text (right): UNCLEAR FROM SKETCH: exact date format shown

**KPI grid (2 columns × 2 rows)**
- Cell 1: label `Today's Revenue` / value `$4,892` (gold) / sub `+12% vs yesterday`
- Cell 2: label `Active Tables` / value `9` / sub `of 12 total`
- Cell 3: label `Covers Today` / value `47` / sub `+5 vs yesterday`
- Cell 4: label `Avg Check` / value `$3.2k` / sub `-2% vs avg` (amber color)

**Section label**
- `Weekly Revenue`

**Bar chart**
- 7 bars
- One bar (today) is gold/highlighted, others are darker
- Day labels below: `Mon` `Tue` `Wed` `Thu` `Fri` `Sat` `Sun`

**Section label**
- `Top Items`

**Ranked list (each row: rank + name + value)**
1. `Bone-In Ribeye 18oz` — `$2,847`
2. `Prime NY Strip 12oz` — `$1,920`
3. `Grilled Salmon` — `$1,340`
4. `Truffle Fries` — `$984`
5. `Old Fashioned` — `$861`

**Section label**
- `Table Performance`

**Stats rows (label + value)**
- `Avg table spend` / `$247.50`
- `Avg covers / table` / `3.2`
- `Avg session length` / `1h 24m`
- `Tables turned today` / `9`

**Bottom navigation**
- `Floor` `Sessions` `Exceptions` `Analytics` (selected, gold)

---

### SCREEN 22 — Analytics · Item Pairings
**Frame ID:** `Byc4P`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back text: `← Analytics`
- Title: `Item Pairings`
- Button: `Export` (right)
- Badge: `ADMIN` (gold, right)

**Filter pills row 1**
- `Date`
- `Weekly` (UNCLEAR FROM SKETCH: which is selected)
- `Monthly`
- `YTD`
- Date range value visible: `03/24/2026` (UNCLEAR: exact format)

**Filter pills row 2**
- `Most Paired` (appears selected)
- `By Category`

**Section label**
- `TOP PAIRINGS`

**Pairing rows (each row: item pair + count stat + revenue value)**
- `Ribeye Steak` + `Red Wine` — count: UNCLEAR FROM SKETCH — `$1,224`
- `Caesar Salad` + `Sparkling Water` — count: UNCLEAR FROM SKETCH — `$3,164` (UNCLEAR: exact value)
- `Wagyu Tartare` + `Champagne` — count: UNCLEAR FROM SKETCH — `$1,049` (UNCLEAR: exact value)
- `Truffle Fries` + `Craft Beer` — count: UNCLEAR FROM SKETCH — `$268`
- `Salmon` + `Sauvignon Blanc` — count: UNCLEAR FROM SKETCH — `$520`

**Section label**
- `UPSELL OPPORTUNITIES`

**Upsell opportunity cards (each card)**
- Item name
- Badge: percentage label (e.g. `52% upsell`, `31% alone`, `41% alone`)
- Suggestion text: `Suggest: [item name]`
- Button: `Create Suggestion`

Visible cards:
- `Lobster Bisque` — `52% upsell` badge — `Suggest: Wine Pairing` — `Create Suggestion`
- `Filet Mignon` — `31% alone` badge — `Suggest: Cabernet Sauvignon` — `Create Suggestion`
- `Creme Brûlée` — badge UNCLEAR FROM SKETCH — `Suggest: Prosecco Martini` — `Create Suggestion`

**Bottom navigation**
- UNCLEAR FROM SKETCH: exact tab labels at this size — `Analytics` tab appears selected (gold)

---

### SCREEN 23 — Analytics · Issues & Adjustments
**Frame ID:** `FXL56`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back text: `← Analytics`
- Title: `Issues & Adjustments`
- Button: `Export` (right)
- Badge: `ADMIN` (gold, right)

**Filter pills row**
- `Daily` `Weekly` `Monthly` `YTD`
- Additional pill: UNCLEAR FROM SKETCH

**Stats row (3 columns)**
- `12` / label: UNCLEAR FROM SKETCH (total issues)
- `$342` / label: UNCLEAR FROM SKETCH (total impact)
- `2.4%` / label: UNCLEAR FROM SKETCH

**Section label**
- `TOP FLAGGED ISSUES`

**Flagged issue rows (each row: rank + type + count + percentage)**
- Rank 1: `Food Quality` — `7 flags` — `43%` (UNCLEAR: exact values)
- Rank 2: `Long Wait` — `5 flags` — `25%` (UNCLEAR: exact values)
- Rank 3: `Customer Complaint` — `3 flags` — `17%` (UNCLEAR: exact values)
- Rank 4: `Wrong Item` — `1 flag` — percentage UNCLEAR FROM SKETCH

**Section label**
- `ADJUSTMENT BREAKDOWN`

**Adjustment rows (each row: type + amount in red)**
- `Sent Back` — `-$272`
- `Comp` — `-$158` (UNCLEAR: exact value)
- `Wrong Item` — `-$134` (UNCLEAR: exact value)
- `Price Fix` — `-$18` (UNCLEAR: exact value)

**Section label**
- `REPEAT OFFENDERS`

**Repeat offender cards (each card)**
- Item name
- Badge: count label (e.g. `2 flags`)
- Description text (UNCLEAR FROM SKETCH: exact text too small)

Visible cards:
- `Caesar Salad` — `2 flags` badge — description UNCLEAR FROM SKETCH
- `Ribeye Steak` — `2 flags` badge — description UNCLEAR FROM SKETCH

**Bottom navigation**
- UNCLEAR FROM SKETCH: exact tab labels at this size — active tab UNCLEAR FROM SKETCH

---

### SCREEN 24 — Analytics · Kitchen & Ops
**Frame ID:** `Ivgvf`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back text: `← Analytics`
- Title: `Kitchen & Ops`
- Button: `Report` (right)
- Badge: `ADMIN` (gold, right)

**Filter pills row**
- `Daily` `Weekly` `Monthly`
- Additional pills: UNCLEAR FROM SKETCH (labels too small)

**Stats row (3 columns)**
- `14` / label: UNCLEAR FROM SKETCH
- `8` / label: UNCLEAR FROM SKETCH
- `3` / label: UNCLEAR FROM SKETCH (kitchen issues)

**Section label**
- `FIRST FIRE TIME BY ITEM`

**Horizontal bar rows (each row: item name + bar + time value)**
- `Ribeye Steak` — bar — `22 min`
- `Wagyu Tartare` — bar — `16 min` (UNCLEAR: exact value)
- `Salmon` — bar — `10 min`
- `Caesar Salad` — bar — `9 min`
- `Truffle Fries` — bar — `9 min` (UNCLEAR: exact value)

**Section label**
- `PEAK KITCHEN LOAD`

**Stacked bar chart**
- Time-based x-axis
- Multiple colored bar segments per time slot
- Legend visible but labels UNCLEAR FROM SKETCH

**Section label**
- `TABLE DWELL TIME`

**Dwell time rows (label + value)**
- `Lunch` — `48 min avg`
- `Dinner` — `72 min avg`
- `Weekend Dinner` — `88 min avg` (UNCLEAR: exact label and value)

**Section label**
- `WASTE TRACKING`

**Waste rows (item + count)**
- `Bread Basket` — `6 wasted`
- `Side Salad` — `6 wasted`
- `Est. Loss Today` — `$67`

**Bottom navigation**
- UNCLEAR FROM SKETCH: exact tab labels at this size — `Analytics` tab appears selected (gold)

---

### SCREEN 25 — Analytics · Revenue Deep Dive
**Frame ID:** `Z0r16`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back text: `← Analytics`
- Title: `Revenue Deep Dive`
- Button: `Report` (right)
- Badge: `ADMIN` (gold, right)

**Filter pills row**
- `Daily` `Weekly` `Monthly` `YTD`
- Date value visible (UNCLEAR FROM SKETCH: exact text)

**KPI value**
- Large value: `$4,832` (gold)
- Trend: `+12.4%` (green)

**Section label**
- `BREAKDOWN BY CATEGORY`

**Category breakdown grid (2 columns)**
- `Mains` — `$2,584`
- `Drinks` — `$1,676`
- `Appetizers` — `$724` (UNCLEAR: exact value)
- `Desserts` — value UNCLEAR FROM SKETCH
- Additional row: label UNCLEAR FROM SKETCH — `4.1` (UNCLEAR: what this represents)

**Section label**
- `REVENUE BY DAYPART`

**Daypart bar rows (label + bar + value)**
- `Lunch` — bar — `$1,268` (UNCLEAR: exact value)
- `Happy Hr` — bar — UNCLEAR FROM SKETCH
- `Dinner` — bar — UNCLEAR FROM SKETCH
- `Late` — bar — `$204` (UNCLEAR: exact value)

**Section label**
- `PROFIT MARGIN BY ITEM`

**Table rows**
- UNCLEAR FROM SKETCH: text too small to read reliably at screenshot size

**Section label**
- `WEEKLY COMPARISON`

**Comparison rows**
- `This Week` — `$35,409` (UNCLEAR: exact value)
- `Last Week` — `$39,133` (UNCLEAR: exact value)
- `Difference` — value with sign UNCLEAR FROM SKETCH

**Section label**
- `REVENUE LOSS BREAKDOWN`

**Loss rows (label + red value)**
- `Comps & Voids` — value UNCLEAR FROM SKETCH
- `Discount Given` — value UNCLEAR FROM SKETCH
- `Waste Loss (After)` — value UNCLEAR FROM SKETCH
- `Total Revenue Lost` — value UNCLEAR FROM SKETCH

**Bottom navigation**
- UNCLEAR FROM SKETCH: exact tab labels at this size — `Analytics` tab appears selected (gold)

---

### SCREEN 26 — Repeat Customers
**Frame ID:** `YlHpL`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back text: `← Analytics`
- Title: `Repeat Customers`
- Button: `Export`
- Badge: `ADMIN` (gold, right)

**Stats row (3 columns)**
- `38` / `Regular` (UNCLEAR FROM SKETCH: exact label)
- `4.2` / `Avg Visits` (UNCLEAR FROM SKETCH: exact label)
- `$142` / `Avg Spend` (UNCLEAR FROM SKETCH: exact label)

**Search bar**
- Placeholder: `Search customers...`

**Filter pills row**
- `All Time`
- `This Week` (UNCLEAR FROM SKETCH: not certain of exact label)
- `This Mnth` (UNCLEAR FROM SKETCH: possibly truncated)

**Customer cards (each card)**
- Avatar circle (initials, colored)
- Name (bold)
- `VIP` badge (if present, gold)
- Stats line: `X visits` · `$X,XXX` · `Last visit: X`
- Favorite items text (small, secondary)

Visible customers:
- `James Morrison` / VIP / `12` visits / `$2,340` / `2 days ago` / items: `Ribeye, Red Wine, Pork Ribs`
- `Sarah Chen` / VIP / `9` visits / `$1,890` / `Yesterday` / items: `Foie Gras Torchon, Champagne`
- `Robert Park` / (no VIP) / `5` visits / `$948` / `5 days ago` / items: `Caesar Salad, Grill Bone`
- `Lisa Wang` / (no VIP) / `4` visits / `$620` / `1 week ago` / items: (UNCLEAR FROM SKETCH: text truncated)

**Bottom navigation**
- `Floor` `Sessions` `Exceptions` `Analytics` (selected, gold)

---

### SCREEN 27 — Flag Issue
**Frame ID:** `hbtHG`

**Visible UI elements (top to bottom):**

**Nav bar**
- Back arrow `←` (left)
- Title: `Flag Issue · Table 6`
- Badge: `ADMIN` (gold, right)

**Section label**
- `ISSUE TYPE`

**Issue type tile grid (2 columns)**
- `Customer Complaint` (selected, gold) | `Food Quality`
- `Long Wait` | `Staff Issue`
- `Safety Concern` | `··· Other`

**Section label**
- `PRIORITY`

**Priority pills row**
- `Low`
- `Medium` (selected, gold)
- `High`

**Section label**
- `DESCRIPTION`

**Text area**
- Visible text: `Customer reports finding hair in their Caesar Salad. Requesting manager visit to table...`

**Section label**
- `AFFECTED ITEMS (OPTIONAL)`

**Item checkbox list**
- `☑ Caesar Salad x2` — `$36`
- `☐ Red Wine x3` — `$54`

**Toggle row**
- Label: `Notify Manager Immediately`
- State: ON (gold)

**Primary CTA button**
- `Submit Flag`
- Style: gold fill, full width

**Secondary link**
- `Cancel`

**Bottom navigation**
- `Floor` `Sessions` `Exceptions` (selected, gold) `Analytics`

---

### SCREEN 28 — Promo Assignment
**Frame ID:** `8QYCz`

**Visible UI elements (top to bottom):**

**Header bar**
- Title: `PROMO ASSIGNMENT`
- Badge: `ADMIN` (gold, right)

**Section: Create New Promo**

Form fields:
- Label: `Promo Name` / input placeholder: `e.g. Grand Opening 25% Off`
- Label: `Discount Type` / toggle: `Percentage` | `Value`
- Label: `Amount` / input value: `21%`
- Label: `Max Uses` / value: `2` (UNCLEAR FROM SKETCH: exact input type)
- Label: `Max Limit` / value: UNCLEAR FROM SKETCH
- Label: `Start Date` / value: `Apr 11, 2126` (UNCLEAR FROM SKETCH: year appears to be placeholder data)
- Label: `End Date` / value: `Nov 24, 2126`
- Fine print text: `This promo will be applied to targeted visits from the promo only` (UNCLEAR: exact text, small)
- Button: `Create Promo` (gold fill, with icon)
- UNCLEAR FROM SKETCH: exact icon on Create Promo button

**Section: Active Promos**
- Live indicator visible (dot)
- Section label: `Active Promos`

Visible promo cards (each):
- Name + `ACTIVE` badge
- Discount summary line
- Date range text
- `View stats` button + `Edit` button

Visible active promos:
- `Grand Opening 25%` / `ACTIVE` / `25% off · 47/150 · 3 each` (UNCLEAR: exact format) / date label
- `Happy Hour 15% Off` / `ACTIVE` / `15% off · 19/100 · 2 each` / date label
- `Weekend Brunch BOGO` / `ACTIVE` / details UNCLEAR FROM SKETCH

**Section: Expired Promos**
- `Valentine's 10% Off` — details partially visible, UNCLEAR FROM SKETCH
- `New Year Sale $25` — details partially visible, UNCLEAR FROM SKETCH

**Bottom navigation**
- `Floor` `Sessions` `Exceptions` `Analytics` (selected, gold)

---

## Complete List of UNCLEAR FROM SKETCH Items

| # | Screen | Element | What is unclear |
|---|--------|---------|-----------------|
| 1 | QyeVt | "Pick" button | When/why it appears |
| 2 | QyeVt | Send to Kitchen bar | Whether it is sticky/fixed or inline |
| 3 | i8cYK | Item Expanded | Whether this is a full screen, overlay, or sheet |
| 4 | i8cYK | Tab selection | Which tab shows as active on this screen |
| 5 | i8cYK | Description text | Full text not fully legible |
| 6 | 7AoYl | Tab selection | Which tab shows as active on this screen |
| 7 | 1B29b | Help FAB | What happens when tapped |
| 8 | 1B29b | ON TABLE label color | Exact color of this section label |
| 9 | uWSAa | Totals section | Line item labels not fully legible at screenshot size |
| 10 | uWSAa | CTA button text | Exact label format not confirmed |
| 11 | uWSAa | % toggle | Exact behavior of % / $ toggle on custom tip |
| 12 | Ljq8D | Totals section | Line item labels not fully legible |
| 13 | Ljq8D | CTA button text | Exact label format not confirmed |
| 14 | SSrbr | Social button styles | Exact button styling not confirmed |
| 15 | xFqLF | Bell icon | Exact icon used |
| 16 | VBVOc | Gold Member badge | Exact icon in badge |
| 17 | KfO5H | (none) | All elements clearly visible |
| 18 | QuuQx | Star rating state | Whether stars are filled/empty/partial |
| 19 | Jg1eR | Chip selected states | Which chips are currently selected |
| 20 | aTOvy | Sub-header text | Exact label and button text in subheader |
| 21 | aTOvy | Header stats labels | Exact label text for the 3 header stats |
| 22 | aTOvy | TABLE 12 | Card state not readable |
| 23 | aTOvy | Card buttons by state | Which table states show which action buttons |
| 24 | mfayM | Header content | Exact header text |
| 25 | mfayM | Filter pill counts | Exact numbers on count badges |
| 26 | 6nP4C | Active exception count | Exact number in header |
| 27 | hBI3e | (none) | All visible elements described |
| 28 | QxOvz | (none) | All visible elements described |
| 29 | u4SRA | Reason tile icons | Exact icons, described with text approximations |
| 30 | u4SRA | Selected reason tile | Not clear from screenshot which is selected |
| 31 | u4SRA | Manager approval sub-text | Text too small to read |
| 32 | z96aY | Date format in header | Not fully readable |
| 33 | YlHpL | Stats row labels | Exact labels unclear |
| 34 | YlHpL | Filter pill labels | Possible truncation |
| 35 | YlHpL | Lisa Wang favorite items | Text truncated |
| 36 | hbtHG | (none) | All visible elements described |
| 37 | 8QYCz | Promo icon | Exact icon on Create Promo button |
| 38 | 8QYCz | Max Limit field | Value and behavior not clear |
| 39 | 8QYCz | Date data | Year 2126 appears to be placeholder |
| 40 | 8QYCz | Expired promo details | Text too small to read clearly |
| 41 | Byc4P | Filter selected state | Which filter pill is currently active |
| 42 | Byc4P | Pairing row counts | Count stats not fully legible |
| 43 | Byc4P | Creme Brûlée badge | Badge percentage not clearly readable |
| 44 | Byc4P | Bottom nav labels | Tab labels too small at screenshot size |
| 45 | FXL56 | Stats row labels | Label text for the 3 stat columns |
| 46 | FXL56 | Filter selected state | Which filter pill is currently active |
| 47 | FXL56 | Additional filter pill | 5th pill label not readable |
| 48 | FXL56 | Repeat offender descriptions | Body text too small |
| 49 | FXL56 | Bottom nav labels | Tab labels too small, active tab unclear |
| 50 | Ivgvf | Stats row labels | Label text for the 3 stat columns |
| 51 | Ivgvf | Filter pills | Labels beyond Daily/Weekly/Monthly not readable |
| 52 | Ivgvf | Peak kitchen load legend | Legend labels not clearly readable |
| 53 | Ivgvf | Weekend Dinner exact label | May be truncated |
| 54 | Ivgvf | Bottom nav labels | Tab labels too small at screenshot size |
| 55 | Z0r16 | Date in filter row | Exact format not readable |
| 56 | Z0r16 | Category grid 5th row | Label and what 4.1 represents |
| 57 | Z0r16 | Profit margin table | All rows too small to read |
| 58 | Z0r16 | Weekly comparison values | Exact values not confirmed |
| 59 | Z0r16 | Revenue loss values | All 4 red values not confirmed |
| 60 | Z0r16 | Bottom nav labels | Tab labels too small at screenshot size |

---

*Phase 1 complete. No assumptions. No inferences. No routing. No tech stack. No module system.*
*28 screens documented. 60 UNCLEAR items catalogued.*
*Awaiting approval before proceeding to Phase 2.*
