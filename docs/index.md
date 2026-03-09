---
project_name: BacklogCompanion
generated_at: 2026-02-19
status: active
---

# BacklogCompanion Documentation

## Project Overview
BacklogCompanion is a mobile application for managing video game backlogs, integrating with Steam and AI services.

## Documentation Index

### 1. Architecture & Design
- **[System Architecture](architecture-root.md)**: High-level overview of the system, technology stack, and patterns.
- **[Source Tree Analysis](source-tree-analysis.md)**: Detailed breakdown of the project structure and critical directories.

### 2. Technical Contracts
- **[API Contracts](api-contracts-root.md)**: Documentation of external APIs (Steam, LLM) and internal data interfaces.
- **[Data Models](data-models-root.md)**: Core entities and database/storage schema definitions.

### 3. Guides & Operations
- **[Development Guide](development-guide.md)**: Setup, building, running, and testing instructions.
- **[Steam Auth & Deep Linking](steam-auth-deeplink.md)**: How Steam OpenID login works via the GitHub Pages shim and iOS custom URL scheme.
- **[Steam Library Sync Engine](steam-library-sync.md)**: How `useSteamSync` fetches, throttles, delta-detects, and persists the Steam game library.
- **[Project Context](../_bmad-output/project-context.md)**: Critical implementation rules and patterns for AI agents.

## Quick Links
- [Repository Root](../)
- [Source Code](../src/)
