<div align="center">

![Naga Films Studio](https://pub.hyperagent.com/api/published/pbf01KZTV47BC_3TFGH8RNDSZASZFN/4f8427c9-dbcf-4a27-babc-61b56df17000.png)

# Naga Films Studio

**Self-hostable AI image, video, cinema and lip-sync production suite — built and curated by Naga Codex.**

[![Built for Naga Codex](https://img.shields.io/badge/Built%20for-Naga%20Codex-FF6B35?style=flat-square)](https://nagacodex.cloud)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Overview

A self-hostable generative video production platform combining image generation, video synthesis, cinematic AI workflows, and lip-sync capabilities. Designed for creators, studios, and teams who want full control over their AI media pipeline.

### What ships

- **Image studio** — AI image generation with in-canvas editing
- **Video synthesis** — text-to-video pipeline with timeline control
- **Cinema workflows** — AI narrative direction, master shots, coverage
- **Lip-sync engine** — character animation with audio sync
- **Self-hosted** — run on your infrastructure; full data privacy
- **SaaS-ready** — built-in auth (NextAuth 5), payments (Stripe), multi-tenant ready
- **Electron desktop** — macOS, Windows, Linux native apps

---

## Built with

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 3.4 |
| Desktop | Electron 33 (macOS, Windows, Linux) |
| Backend | Next.js API + Drizzle ORM |
| Database | Neon (PostgreSQL serverless) |
| Auth | NextAuth 5 (OAuth + credentials) |
| Payments | Stripe (optional) |
| Build tools | Vite 5, pnpm 10 |

---

## Architecture

```
workspaces:
  packages/studio/                Next.js app + UI
  packages/Vibe-Workflow/         Workflow builder (React)
  packages/Open-Poe-AI/           AI agents (LangGraph-style)
```

---

## License & Attribution

**© 2026 Naga Films / Naga Codex — All Rights Reserved (where applicable)**

This project builds on open source foundations (see individual package licenses), but the Naga Films Studio distribution, UI, integrations, and production workflows are **proprietary work by Maurice Holda** and subject to usage restrictions.

**You may NOT:**
- Redistribute this as your own work
- Use the Naga Films brand or logo without permission
- Clone and resell as a competing product

**You MAY (with credit):**
- Fork and modify for internal use
- Reference the architecture or techniques in your own projects
- Link to this repository and cite the original work

For commercial licensing, partnerships, or derivative work permission: **[contact Naga Codex](https://nagacodex.cloud)**

---

## Built by

**[Maurice Holda](https://nagacodex.cloud)** — Hamburg, Germany  
AI filmmaker, software architect, security consultant

---

<div align="center">

**[Naga Codex](https://nagacodex.cloud) · [Naga Films Studio](https://github.com/Nagacash/nagafilms-studio)**

</div>
