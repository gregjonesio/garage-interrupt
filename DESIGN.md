---
name: Garage Interrupt
description: Your car has patch notes. We show you the ones that matter.
colors:
  guide: "oklch(0.43 0.105 163)"
  guide-deep: "oklch(0.35 0.088 163)"
  exit: "oklch(0.875 0.175 93)"
  service: "oklch(0.37 0.125 258)"
  work: "oklch(0.74 0.17 62)"
  worth-knowing-mark: "oklch(0.74 0.16 158)"
  sky: "oklch(0.915 0.012 235)"
  plate: "oklch(0.995 0.002 100)"
  legend-white: "#fff"
  ink: "oklch(0.2 0.012 250)"
  ink-soft: "oklch(0.37 0.018 245)"
  asphalt: "oklch(0.285 0.007 260)"
  asphalt-lift: "oklch(0.345 0.008 260)"
  asphalt-line: "oklch(0.53 0.008 260)"
  paint: "oklch(0.965 0.006 100)"
  paint-soft: "oklch(0.8 0.008 260)"
typography:
  display:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.4vw, 5rem)"
    fontWeight: 800
    lineHeight: 0.98
  headline:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.02
  title:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.2rem)"
    fontWeight: 800
    lineHeight: 1.05
  figure:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "\"tnum\" 1"
  body-small:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.035em"
  mono:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  sign: "14px"
  sign-sm: "9px"
  box: "4px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  sign-pad: "24px"
  sign-pad-wide: "40px"
  column-gap: "56px"
  section-tight: "80px"
  section: "96px"
components:
  sign-guide:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.legend-white}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-guide-sm:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sign-sm}"
    padding: "0 12px"
    height: "44px"
  sign-fact:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-fact-sm:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign-sm}"
    padding: "16px 20px"
  sign-service:
    backgroundColor: "{colors.service}"
    textColor: "{colors.legend-white}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-service-link:
    backgroundColor: "{colors.service}"
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sign-sm}"
    padding: "12px 20px"
    height: "44px"
  sign-work:
    backgroundColor: "{colors.work}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-thru:
    backgroundColor: "{colors.asphalt-lift}"
    textColor: "{colors.legend-white}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  exit-panel:
    backgroundColor: "{colors.exit}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "12px 24px"
  vehicle-plaque:
    backgroundColor: "{colors.guide}"
    textColor: "{colors.legend-white}"
    rounded: "{rounded.sign-sm}"
    padding: "12px 12px 10px"
  vehicle-plaque-selected:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign-sm}"
    padding: "12px 12px 10px"
  state-interrupt:
    backgroundColor: "{colors.exit}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.box}"
    padding: "4px 8px 2px"
  state-worth-knowing:
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    rounded: "{rounded.box}"
    padding: "4px 8px 2px"
  state-ignored:
    textColor: "{colors.legend-white}"
    typography: "{typography.label}"
    padding: "4px 0 2px"
  stepper-button:
    textColor: "{colors.legend-white}"
    rounded: "8px"
    size: "44px"
  stepper-button-hover:
    backgroundColor: "{colors.legend-white}"
    textColor: "{colors.guide}"
  matrix-head:
    textColor: "{colors.legend-white}"
    rounded: "{rounded.box}"
    height: "48px"
  matrix-head-selected:
    backgroundColor: "{colors.legend-white}"
    textColor: "{colors.guide-deep}"
    rounded: "{rounded.box}"
    height: "48px"
  text-link:
    textColor: "{colors.service}"
---

# Design System: Garage Interrupt

## Overview

**Creative North Star: "The Interchange"**

Garage Interrupt is an interchange for notices. Every notice travels the same road, and only the few that matter to one vehicle take its exit. The visual system is the interstate guide sign system under an overcast sky: green guide panels with a white border set in from the edge, yellow exit panels, white fact plates, blue service signs, orange work-zone signs, and one asphalt band of painted marks. The lettering is Overpass, a face drawn from highway signage.

The page reads the way a driver reads a gantry. One large guide sign carries the claim and the counts for a named vehicle. A row of smaller signs, each with its make on a plaque, lets the visitor change vehicle. Below, the road holds every notice as a painted mark, and the marks that reached the chosen vehicle light up and repeat in the exit lane as links. Density is moderate on the signs and high on the road, where every notice in the period is one mark in a single band.

The system refuses the dark AI dashboard of metric cards. Counts live on signs and on the road. Surfaces are flat, the sky is pale, and the only dark surface is the asphalt.

**Key Characteristics:**
- Every container is a sign: a colored blank, an inset border, rounded corners, one soft shadow beneath.
- Color carries road meaning and nothing else.
- Every state has a second signal in shape, size, or words.
- One type family, with capitals kept for the legend voice.
- Source text is quoted as written and sits under a rule or on a white plate.
- Light color scheme only (`color-scheme: light`).

## Colors

The palette is the road's own: five sign colors with fixed meanings, set against a pale overcast sky and one band of asphalt. All values are authored in OKLCH.

### Primary
- **Guide Green** (`guide`, oklch(0.43 0.105 163)): the guide sign. The hero sign, navigation plaques, vehicle plaques, notice signs for anything that reached a vehicle, the comparison tables, and the garage cards.
- **Deep Guide Green** (`guide-deep`, oklch(0.35 0.088 163)): green as text on a light surface. The worth-knowing state word on white plates and the label of the selected column head in the matrix.

### Secondary
- **Exit Yellow** (`exit`, oklch(0.875 0.175 93)): interrupt. The exit count plaque on the hero, the panel along the bottom edge of an interrupt sign, the interrupt state box, the filled matrix cell, and the interrupt marks on the road. Always paired with ink text and an ink border.

### Tertiary
- **Service Blue** (`service`, oklch(0.37 0.125 258)): points somewhere. The footer sign naming the source, the link sign to the NHTSA record, the link sign to the method page, every in-text link on a white plate, and the focus outline on light surfaces.
- **Work Orange** (`work`, oklch(0.74 0.17 62)): unfinished or not measured. The accuracy panel while no benchmark exists, the notice that a pair has not been judged, and the work-zone banner shown when figures are not from Jev. Ink text, ink border.
- **Lit Green** (`worth-knowing-mark`, oklch(0.74 0.16 158)): the worth-knowing mark on asphalt, where guide green would be too dark to read. Used for the road tick and the exit-lane marker. It is written inline in the road component and is not yet a custom property.

### Neutral
- **Overcast Sky** (`sky`, oklch(0.915 0.012 235)): the page background.
- **Fact Plate White** (`plate`, oklch(0.995 0.002 100)): the blank of every white plate.
- **Legend White** (`legend-white`, #fff): lettering and borders on green, blue, and asphalt-grey signs. Supporting text on those signs is the same white at 90% opacity. Rules on signs are white at 60% to 70%, table row lines at 35%.
- **Ink** (`ink`, oklch(0.2 0.012 250)): text on sky, plate, yellow, and orange. Borders of plates, yellow panels, and orange signs. Dividers on light surfaces are ink at 20% to 25%, or a 2px to 4px ink rule for a section break.
- **Soft Ink** (`ink-soft`, oklch(0.37 0.018 245)): supporting text and label text on light surfaces.
- **Asphalt** (`asphalt`, oklch(0.285 0.007 260)): the road band.
- **Lifted Asphalt** (`asphalt-lift`, oklch(0.345 0.008 260)): the blank of the through sign, which states an ignored verdict.
- **Asphalt Line** (`asphalt-line`, oklch(0.53 0.008 260)): ignored marks on the road, and the outline of a mark not yet judged.
- **Paint** (`paint`, oklch(0.965 0.006 100)): text, lane lines, and the right edge line on asphalt.
- **Soft Paint** (`paint-soft`, oklch(0.8 0.008 260)): supporting text and date labels on asphalt.

### Named Rules
**The Road Meaning Rule.** A color means what the road says it means, on every surface. Green guides. Yellow interrupts. White states fact and holds source text. Blue points the way: to a source record, to the method, or to a notice. Orange marks what is unfinished or not measured, and gives way to a white plate once the work is done. A color never appears for its looks.

**The Yellow Is The Exit Rule.** A yellow fill says interrupt and nothing else. Selection is a white plate, hover is a lift or a white fill, and emphasis is weight. Outside that, yellow appears in three utility places only: the road's left edge line, the focus outline on dark surfaces, and the text selection highlight.

**The Second Signal Rule.** Every state is told apart by shape or words as well as color. Interrupt is a filled box with a dark border, worth knowing is an empty box with a border, ignored has no box. On the road the three differ in size and outline. Each source type has its own outline mark.

## Typography

**Display Font:** Overpass (with system-ui, sans-serif)
**Body Font:** Overpass (with system-ui, sans-serif)
**Label/Mono Font:** Overpass Mono (with ui-monospace, monospace)

**Character:** One family does all the work, as it does on the road. Headlines are heavy and tight, body text is plain and open, and capitals are kept for short labels and commands. Tabular numerals are on everywhere (`"tnum" 1` on body), so figures line up in tables and counts.

### Hierarchy
- **Display** (800, clamp(2.5rem, 6.4vw, 5rem), line-height 0.98): the hero headline. Page headlines on the method, garage, and vehicle pages use the same weight and line-height at a slightly smaller clamp (up to 4.2rem).
- **Headline** (800, clamp(2rem, 4.4vw, 3.4rem), line-height 1.02): section headings on the home page. Width is held to 18ch to 24ch so they break into two lines.
- **Title** (800, clamp(1.6rem, 3vw, 2.2rem), line-height 1.05): secondary headings and the vehicle name on the hero. Notice titles on signs are fixed at 21px, line-height 1.15.
- **Figure** (800, clamp(2rem, 5vw, 3.1rem), line-height 1): counts and probabilities on signs. The through count on the hero steps up to clamp(2.4rem, 6vw, 3.9rem). Small figures inside notice signs are 22px.
- **Body** (400, 17px, line-height 1.625): running text. Line length is held between 52ch and 72ch, most often 60ch to 66ch. The hero subhead is 600 weight at clamp(1.35rem, 3vw, 2.2rem).
- **Body Small** (400, 15px, line-height 1.375 to 1.625): supporting lines on signs, captions, and footer text. Table cells use 14px to 16px.
- **Label** (800, 11px to 15px, letter-spacing 0.035em, uppercase): the legend voice. 11px for table heads and the plaques on vehicle signs, 12px for field labels, 14px to 15px for plaques, links, and small headings.
- **Mono** (400, 13px, line-height 1.625): the state and question JSON on white plates, answer type names, NHTSA record IDs, and the model name.

### Named Rules
**The Legend Rule.** Capitals belong to the legend voice alone: labels, table heads, plaques, and commands. Headlines and body are sentence case. Vehicle names are destinations and stay in mixed case, even as column heads. Source titles are shown as the source wrote them, capitals included.

## Layout

One centered column, 1240px at most, with a 16px gutter that widens to 24px at 640px. The header is a row of three plaques: the name on a white plate at the left, two green navigation plaques at the right. Sections are separated by space alone, 80px to 96px above each.

Two-column arrangements are asymmetric grids that collapse to one column below 1024px: the hero (1.1fr to 1fr), the questions section (1.25fr to 1fr), panel signs (1fr to 1.3fr), and the notice page (1.15fr to 1fr). Column gaps are 56px in most places. Notice signs and garage cards sit two across from 768px, with 28px to 32px between them.

Inside a sign, padding is 24px on a phone and 40px on large panels from 640px. The hero sign goes to 56px at 1024px. Small signs use 16px by 20px.

Responsive behavior is structural, not just fluid:
- **Vehicle signs:** a sideways snap strip on a phone, a four-column grid at 640px, eight columns at 1024px. The chosen sign is scrolled into view.
- **The road:** runs down the page on a phone, one row per day with the date at the left, and across the page at 1024px, one column per day with a date under each Monday. The edge lines turn with it.
- **Wide tables:** keep a minimum width (640px to 1080px) and scroll sideways inside their sign. The matrix uses a fixed table layout, pins its notice column (176px, 264px from 640px), and scrolls the chosen vehicle's column into view.
- **Hero support text:** inside the sign at 1024px, below the vehicle signs on smaller screens.

### Named Rules
**The One Road Rule.** The asphalt band is the only full-bleed surface and the only dark one. Everything else sits inside the 1240px column on the sky.

## Elevation & Depth

Signs hang in the air. Each one casts a single soft shadow tucked beneath its bottom edge, and nothing else on the page casts a shadow at all. Depth otherwise comes from the inset border and from the contrast between sign and sky. Surfaces are flat fills.

### Shadow Vocabulary
- **Sign** (`box-shadow: 0 0 0 4px <blank>, 0 22px 28px -20px oklch(0.2 0.02 250 / 0.55)`): every full-size sign. The first layer is the outer ring in the sign's own color, the second is the shadow.
- **Small sign** (`box-shadow: 0 0 0 3px <blank>, 0 12px 16px -12px oklch(0.2 0.02 250 / 0.5)`): plaques, link signs, small plates, the tooltip plate.
- **Flat sign** (`box-shadow: 0 0 0 4px <blank>`): a plaque mounted on another sign, such as a vehicle plaque, the interrupt count on the hero, or the plate of measured figures at the foot of the hero. Ring only, no shadow.

### Named Rules
**The Hung Sign Rule.** Only signs cast a shadow, and they cast one. A plaque mounted on another sign is flat. Hover moves a sign up by 2px to 4px and leaves the shadow as it is.

**The Flat Fill Rule.** Every surface is one flat fill. No gradients, no glows, no glass. A tint on a sign is white at 10% to 15% opacity, used for the selected row or column.

## Shapes

The sign is the form. It has rounded corners (14px, or 9px when small) and a border set in from the edge, so the sign's own color shows as a thin margin outside the border. Small boxes for state words, matrix cells, and table buttons have gently squared corners (4px). Marks on the road are squares. Drawn glyphs use flat fills, square line ends, and mitred joins: a block arrow rotated to eight directions, and five outline marks for source types (wide rectangle for a manufacturer communication, diamond for a recall, inverted triangle for an investigation, tall rectangle for an owner complaint, circle for anything else).

A plaque sits on the top edge of its sign at the right, with its bottom corners squared and its bottom border overlapping the sign by 3px, the way an exit number plaque is mounted on the road. What it says is plain: the vehicle's make on a vehicle sign, and the vehicle's place in the set on the hero. The word exit is not used as a label, because a visitor should not have to decode the road to read the page.

Motion is short and eased out (cubic-bezier(0.16, 1, 0.3, 1)): 150ms for color, 200ms for a lift, 500ms for road marks changing state, 550ms for view transitions. The one continuous motion is the dashed centerline on the hero fork, which drifts along the arrow. With reduced motion requested, the drift and the view transitions stop.

### Named Rules
**The Inset Border Rule.** A sign is a colored blank with its border set in from the edge: a 4px border in the legend color, then a 4px ring of the blank color outside it. Small signs use 3px and 3px. The border is never flush with the outer edge.

## Components

### Signs (containers)
The only container. Six faces share one construction.
- **Corner Style:** softly rounded (14px), small signs 9px.
- **Guide:** guide green blank, white legend, white border. Notices that reached a vehicle, the hero, tables of comparison, garage cards.
- **Fact plate:** plate white blank, ink legend, ink border. Source text, record fields, the five questions, JSON, full listings, the name plaque, the road tooltip, and the accuracy panel once a benchmark exists.
- **Exit:** exit yellow blank, ink legend, ink border. Used small and flat for the interrupt count.
- **Service:** service blue blank, white legend, white border. The footer and links out.
- **Work:** work orange blank, ink legend, ink border. Anything unfinished or unmeasured. The accuracy panel is a work sign only while no benchmark exists.
- **Through:** lifted asphalt blank, white legend, white border. The verdict sign when the state is ignored.
- **Shadow Strategy:** see Elevation. One shadow, or none when mounted.
- **Internal Padding:** 24px, 40px on large panels, 16px by 20px on small signs.
- **Hover:** a sign that is a link lifts 4px over 200ms. A vehicle sign lifts 2px.

### Notice sign (signature)
A guide sign for one notice. Title at 21px, a line with the source type mark, type, date, and manufacturer, then the source's excerpt as a blockquote under a 2px white rule at 60% opacity. Four figures sit at the bottom: relevance, attention, interrupt, and area, each a legend label over a heavy value. The bottom edge is a band under a 4px white rule that names the state and the action. For an interrupt the band is exit yellow with ink text and an arrow pointing down and to the right, as EXIT ONLY does. For worth knowing the band stays green and the arrow points right.

### Buttons and links
- **Link sign:** a small service sign, legend voice at 15px, 12px by 20px padding, at least 44px tall, with a block arrow after the words. The arrow points up and right for a link that leaves the site and right for a link within it. The notice page has one primary action, the blue sign to the NHTSA record. Documents filed with the record are in-text links beneath it.
- **Stepper:** a 44px square with a 2px white border and softly rounded corners (8px), holding a block arrow. On hover it fills white and the arrow turns guide green, over 150ms.
- **Table buttons:** a vehicle in a table is a full-width button, at least 44px tall in a row head and 48px tall in a matrix column head. Hover underlines the name in a row head and tints a column head white at 15%. The pressed one is marked with `aria-pressed`: a white tint on its row, or a white fill with deep guide green lettering on its column head.
- **Back link:** legend voice at 14px in soft ink with a left arrow, turning ink on hover.
- **Text links:** on a white plate an in-text link is service blue and underlined (0.18em offset, 0.08em thickness) at 600 to 700 weight. A link to a filed document also carries a 14px arrow pointing up and right. On asphalt an in-text link is paint and underlined. On a guide sign a notice title is plain and underlines on hover.
- **Focus:** a 3px outline, offset 3px, with 4px corners. Service blue on light surfaces, exit yellow on green, blue, and asphalt.

### State words and cells (chips)
- **Interrupt:** exit yellow fill, 2px ink border, ink legend text, 4px corners. In the matrix it also carries a 1px white outline.
- **Worth knowing:** no fill, 2px border, legend text. White border and text on a sign. Guide green border with deep guide green text on a plate.
- **Ignored:** no box. The word alone, at reduced strength.
- **Matrix cells:** the same three shapes holding the relevance number at 16px. Screen readers get the number, the word percent, and the state word.

### Navigation
Three plaques in the header, each a small sign at least 44px tall in the legend voice (15px to 17px for the name, 14px to 15px for the links). The name is a fact plate. Method and Garage are guide signs. There is no menu on a phone: the name wraps to two lines and the row stays. A skip link appears on focus on a plate white background.

### Vehicle signs (picker)
A radio group of small guide signs, one per vehicle. Each carries its make on a flat plaque above its top right edge (11px legend), the vehicle's short name at 17px and 800 weight, and its interrupt count at 13px. The chosen sign and its plaque turn to fact plates: white blank, ink legend, ink border.

### The road (signature)
A full-bleed asphalt band. A yellow edge line on the through side, a white edge line on the exit side, and a dashed white lane line between the through lanes and the exit lane, all 4px. The three lines turn with the road: across the page on a desktop, down the page on a phone.
- **Through lanes:** every notice is one square mark, 7px on a phone and 5px on a desktop, 2px apart, in publication order. Ignored is asphalt-line grey at base size. Worth knowing is lit green at 1.7 times the size with a 1px paint outline. Interrupt is exit yellow at 1.7 times (2.4 times on a desktop) with a 1px asphalt ring. Not yet judged is an empty outline.
- **Exit lane:** the marks that reached the vehicle repeat as square links, 28px on a phone and 24px on a desktop, with 3px corners. Interrupt has a 3px ink border and a 2px paint outline. Worth knowing has a 2px paint border. Hover scales a marker to 110%.
- **Legend:** three items above the road, each naming its state and its look in words.
- **Tooltip:** a small fact plate, 280px wide, with the notice title, type, date, and state. With a finger it pins in place and adds two legend-voice actions.

### The fork (signature)
The hero diagram. A white arrow runs straight up for the through route, with two white branches curving right to arrowheads. A dashed guide green centerline drifts along each path. Above it, one line states how many notices entered. Three counts sit beside the three arrowheads, labelled in plain words: ignored, worth knowing, and interrupts, the last on a yellow plaque.

### Measured figures and actions (hero foot)
Under a 2px white rule at the foot of the hero: a flat white fact plate holding three measured figures (decisions, median response, cost), set out as a distance sign sets out miles, with the name in the legend voice and the figure at 800 weight. Across a row from 640px with 1px ink rules between, down a list on a phone with the figure at the right. Beside it, one flat service sign for the main action, with a block arrow pointing down because it leads further down the page, and one underlined legend link for the method. On a phone this block comes straight after the headline, ahead of the vehicle. The figures are read from the decisions in the build and are never typed in.

### The comparison (signature)
One real notice beside every vehicle. At the left, a white fact plate with the source type, date, title (two lines at most) and the opening of the source text (three lines at most), a link to the notice, and the controls: two steppers in ink, the position in the legend voice, and a control that stops or restarts the change. At the right, a guide sign read as a distance sign: the six vehicles Jev scored highest, each a row with the vehicle at the left and the relevance in the matrix cell shapes at the right, with a 4px bar along the row's foot whose length is the relevance. The bar is exit yellow for an interrupt, white for worth knowing, and white at 55% for ignored. The remaining vehicles are one line of text. Title and excerpt hold their height so the page does not move when the notice changes. It advances every seven seconds until the visitor steps by hand, holds while pointed at or focused, and does not advance when reduced motion is requested.

### Tables
Tables live inside a sign. Heads are in the legend voice at 11px to 12px. Rows are divided by a 1px line (white at 35% on green, ink at 20% on a plate). Numbers are right-aligned, and the relevance column is 800 weight. The selected row or column is tinted white at 10% to 15%. On a white plate the notice title in a row is an in-text link in service blue.

The matrix is a distance sign read sideways, in a fixed layout so the vehicle columns are equal. Each column head is the model year (13px, 700) over the vehicle's short name (11px, 800, mixed case), set upright on one line. The chosen column head fills white with deep guide green lettering. Model names and document numbers use a non-breaking hyphen so they stay on one line.

### Lists on the sky
Plain lists use a top rule on each item with 12px above the text: a 1px rule in ink at 25% for ordinary items, a 2px rule in ink at 80% for the list of things the product does not do. Method sections open with a 4px ink rule.

## Do's and Don'ts

### Do:
- **Do** pick a sign by what it says: guide green for guidance and notices that reached a vehicle, a white plate for facts and source text, service blue for signs and in-text links that point to NHTSA, the method, or a notice, work orange for anything unfinished or unmeasured, asphalt grey for an ignored verdict.
- **Do** turn a work sign into a white fact plate once the thing it marks has been measured or finished.
- **Do** show selection with a white plate or a white fill, as the chosen vehicle sign and the chosen matrix column do.
- **Do** give every state a second signal: a box shape, a border, a size, or the state word itself.
- **Do** build every sign with the inset border: 4px border, 4px outer ring, 14px corners, or 3px, 3px, and 9px for a small sign.
- **Do** set labels and commands in the legend voice (800, uppercase, 0.035em) and everything else in sentence case.
- **Do** keep labelled controls at least 44px tall.
- **Do** keep source text in the source's words, in a blockquote, on a fact plate or under a rule on a guide sign.
- **Do** switch the focus outline from service blue to exit yellow on green, blue, and asphalt surfaces.
- **Do** stop the traffic drift and view transitions when reduced motion is requested.

### Don't:
- **Don't** use a yellow fill for selection, hover, highlights, badges, or decoration. Yellow fill means interrupt.
- **Don't** use gradients, glows, blurs, or glass. Fills are flat.
- **Don't** build the dark AI dashboard of metric cards. Counts live on signs and on the road, not in a grid of stat tiles.
- **Don't** rely on color alone for any state.
- **Don't** set headlines in capitals or apply the legend voice to running text.
- **Don't** write decorative or invented copy inside a sign. Text about a notice is the source's own or a fixed template.
- **Don't** put a shadow on anything that is not a sign, and don't stack shadows.
- **Don't** introduce a hue the road does not use.
- **Don't** add a second type family. Overpass and Overpass Mono carry everything.
