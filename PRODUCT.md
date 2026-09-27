# Product

<!-- impeccable:product-schema 1 -->

Source of every fact below: Greg's written project brief of 2026-09-26. No interview round was held because the brief asked for autonomous work; anything marked (inferred) is my reading of the brief, not a confirmed answer.

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind, deployed to Vercel. Named as preferred in the brief. Jev is called server-side or offline only; the key never reaches the browser. Storage for v1 is a file-based decision cache committed to the repo (inferred: the brief allows Supabase "if persistent storage is useful"; with predefined vehicles and a replayed stream it is not needed yet).

## Users

Visitors arriving from a link (TypeSafe community, LinkedIn, developer circles) who have never heard of Semantic Interrupt and give the page about ten seconds. There are no accounts and no sign-up in v1. (inferred) A second audience is car owners and enthusiasts who recognize the notices themselves.

## Product Purpose

New automotive information is published constantly: manufacturer communications, service bulletins, recalls, investigations, owner complaints. Garage Interrupt decides whether each piece of information matters to one specific vehicle. It is a public showcase for Jev, TypeSafe AI's System One decision model.

Success for the MVP: a visitor opens the homepage, understands Semantic Interrupt within seconds, switches between predefined vehicles, sees the same events receive materially different judgments, opens an event, reaches the official source, and understands that Jev filters attention rather than generating content or predicting failures.

## Positioning

Semantic Interrupt: traditional software detects that something happened; this asks whether something happened that matters enough to change what this particular state should pay attention to. The primitive is `state + incoming event -> attention decision`. Garage Interrupt is the automotive demonstration of that primitive.

Tagline from the brief: "Your car has patch notes. We show you the ones that matter."

## Operating Context

- Source data: official NHTSA public datasets first (manufacturer communications, recalls, investigations, complaints). Other sources such as manufacturer OTA release notes come later through the same ingestion interface.
- Every vehicle and event pair is sent to Jev as one state with five typed questions: relevance (noul), attention (noul), consequence (score), primary area (choice), interrupt (noul).
- The app maps probabilities to IGNORE, WATCH or INTERRUPT deterministically.
- Decisions are cached by vehicle state hash + event hash + question schema version, with the raw Jev output stored.

## Capabilities and Constraints

- Jev returns typed probabilities only. It cannot write prose, browse, calculate, or explain itself. No explanation of a Jev decision is ever generated or displayed.
- Text shown about a source comes from the source itself or from a deterministic template.
- Matching facts (year matches, model matches) are shown only when they come from structured source fields.
- 10 to 20 predefined, fictional vehicle profiles. They are not real people's cars.
- A mock mode exists for development; mock output must never be presented as Jev's.
- Historical replay of accumulating information is phase 2.
- Not decided: whether real user vehicles are ever supported; whether Supabase replaces the file cache.

## Brand Commitments

- Name: Garage Interrupt.
- The product is an attention filter. It is NOT an AI mechanic, a recall lookup tool, a chatbot, a diagnosis system, a prediction system, a maintenance tracker, or a summarizer.
- Never say or imply: "your vehicle is unsafe", "this component will fail", "stop driving", "Jev detected a defect", or any probability of mechanical failure.
- Say instead: "this manufacturer communication appears highly relevant to your vehicle configuration", "this item warrants attention based on your vehicle state".
- Owner complaints are always labelled as unverified reports.
- Every item displays and links to the authoritative source.
- Never claim Jev predicted a recall.

## Evidence on Hand

- Real NHTSA records, ingested by `scripts/` into `data/`.
- Real Jev outputs for every vehicle and event pair, with measured latency and token counts.
- Absent, and not to be fabricated: any accuracy, recall, false-positive or noise-suppression statistic. These appear only after a human-labelled benchmark exists.

## Product Principles

1. Relevance of information, never mechanical truth.
2. Jev decides; code and source text do everything else.
3. The source is always one click away.
4. Show only numbers that were measured.
5. Build the excellent automotive demonstration before any general framework.
