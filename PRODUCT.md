# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary users (optimize first): Driver, Conductor, and Operator/Admin staff who run daily transit operations.

Secondary users: Passengers who book trips, hold tickets, and track buses.

## Product Purpose
SmartTransit is a role-based bus operations and ticketing system for the Davao Region.

It enables staff to safely run day-to-day service (scheduling, assignment, shift operations, validation, occupancy, reporting) while supporting passenger booking, QR ticketing, and payment flows.

Success means operations are secure, auditable, and reliable across staff workflows, with passenger experience remaining functional and trustworthy.

## Positioning
SmartTransit combines staff operations, QR ticketing, and both digital plus onsite payment records in one system with strong role boundaries.

Its meaningful differentiator is end-to-end operational continuity across multiple roles (Driver, Conductor, Operator/Admin), not a passenger-only booking surface.

## Operating Context
- Web-based, role-specific portals are used during active transit operations.
- Staff actions are constrained by assignment and shift-block safety rules.
- Operator/Admin workflows include schedule and fleet/staff management plus reporting.
- Driver/Conductor workflows include pairing/verification gates and in-trip operational actions.
- Thesis and implementation scope are explicitly documented and intentionally bounded.

## Capabilities and Constraints
Confirmed capabilities:
- RBAC across Passenger, Driver, Conductor, Operator, and Admin roles.
- QR ticket validation and occupancy/load workflows.
- Digital payment integration and onsite payment logging in one system.
- Polling-based operational tracking and reporting workflows.

Non-negotiable constraints to preserve:
- Security posture defined in ../ACCOUNT_SECURITY_AUDIT.md.
- Documented system scope boundaries in ../SDD.md.
- Manila-anchored business-day/timezone rule.
- Layered architecture discipline tracked in ../ARCHITECTURE_AUDIT.md.
- Shift-block safety rules.

Explicit scope note:
- Dynamic/adaptive rerouting is documented as future work; this product currently centers fixed-route operations with operator-managed scheduling.

## Brand Commitments
- Product name: SmartTransit.
- Domain commitment: bus transit operations in the Davao Region.
- Voice/identity details beyond the above are not yet formally specified.

## Evidence on Hand
- Architecture and role/workflow reference: ../ARCHITECTURE.md
- Security requirements baseline: ../ACCOUNT_SECURITY_AUDIT.md
- Scope boundaries and objective framing: ../SDD.md
- Objective compliance evidence: ../THESIS_OBJECTIVES_AUDIT.md
- Layering and implementation discipline tracker: ../ARCHITECTURE_AUDIT.md

Design system documentation:
- DESIGN.md is now documented at project root for incumbent visual guidance.

## Product Principles
1. Protect role boundaries and high-impact actions by default.
2. Keep operational workflows explicit, auditable, and predictable.
3. Preserve documented scope decisions instead of implying unsupported behavior.
4. Favor reliability in daily service execution over novelty.
5. Keep system behavior consistent across staff roles while respecting each role's limits.

## Accessibility & Inclusion
Accessibility is a required product constraint.

Project-level accessibility requirements are treated as non-negotiable, and future UI work should preserve readable, operable, and role-critical interactions across supported devices.