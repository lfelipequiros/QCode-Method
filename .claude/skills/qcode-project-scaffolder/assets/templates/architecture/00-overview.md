# 00 — Architecture Overview

The Architecture Specification Document (ASD) for {{PROJECT_NAME}}: the reference for *what is
correct*. Settle design questions here before building. Decisions are recorded as ADRs in
[`01-principles-and-decisions.md`](01-principles-and-decisions.md); this overview is the map.

## What we're building

{{ONE_LINER}}

{{DOMAIN_SUMMARY}}

## The system at a glance

{{ARCHITECTURE_OVERVIEW}}

*(to define: the layered view — the components, and the **seams** that hold them apart. A seam is a
stable interface where everything above it is "X" and everything below it is "Y," so each side can
change without breaking the other. Identify your project's seams here; they are the most important
architectural decision you'll make and the thing the gates protect. Record each as an ADR.)*

## Core data model

*(to define: the central entities, their relationships, and tenancy scoping ({{TENANCY}}). For each
tenant-scoped entity, how is isolation enforced? Record as an ADR.)*

## What this architecture deliberately does *not* include (yet)

Per the stage-gated principle, name the heavier infrastructure you are **not** building, and the
**trigger** that would change that:

*(to define: e.g. "a job queue — add when a single run can't finish inside the function limit"; "a
cache — add when read latency exceeds X"; "streaming/real-time — not until the freshness contract
demands it"; "agents — until product complexity demands it." Until a trigger fires, don't build it.)*

## Cross-cutting concerns

*(to define: identity & access, observability, security — document each alongside the layers as the
project grows. Keep this overview current; it's the map everyone reads first.)*
