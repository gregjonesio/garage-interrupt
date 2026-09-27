# Data in this repository

The MIT licence in `LICENSE` covers the code. It does not cover anything in `data/`. No rights are claimed over that material and none are granted.

## Where it comes from

Every notice in `data/events.json` is a record published by the National Highway Traffic Safety Administration, Office of Defects Investigation, in its public flat files at `static.nhtsa.gov/odi/ffdd/`. `data/window.json` records the address, size, SHA-256 and retrieval time of each file that was read.

This project is not affiliated with or endorsed by NHTSA, TypeSafe AI, or any vehicle manufacturer.

## Who wrote what

| Material | Written by | How it is used here |
|---|---|---|
| Recall and investigation text | NHTSA and the manufacturer, filed under federal reporting rules | Shown in full, with a link to the NHTSA record |
| Manufacturer communication summaries | The manufacturer, as filed with NHTSA | The summary NHTSA publishes is shown in full. The bulletin itself is linked on NHTSA's site and is not copied |
| Owner complaint narratives | Members of the public | The site shows an excerpt and links to the full report on NHTSA's site |
| Decisions in `data/decisions/` | Output of TypeSafe AI's Jev model, called by this project | Numbers only |

## Owner complaints

Complaint narratives are handled more carefully than the rest, for two reasons: they are written by private individuals, and NHTSA's redaction is imperfect.

- Location, VIN and dealer columns in NHTSA's file are never read into this project.
- A complaint whose text contains an email address, a phone number, a full VIN, a case number or a street address is left out entirely. The release gate refuses a snapshot that contains one.
- The site shows an excerpt, not the whole narrative.
- This repository holds the whole narrative in `data/events.json`. That is the text Jev was given, and the release gate checks every decision against it, so it cannot be shortened here. It is the same text NHTSA publishes.
- Every complaint is labelled as an unverified report.

Pattern matching cannot find a name. If you are the author of a complaint shown on the site and want it removed, write to the site owner through https://gregjones.io, and it will be left out of the next snapshot.

## If you reuse this data

Go to NHTSA for it, not to this repository. NHTSA's copy is current and this one is a fixed snapshot. Check NHTSA's terms of use yourself; nothing here is legal advice.
