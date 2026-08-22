# ROSIMS

> **Research, Observation, Surveillance & Intelligence Management System (ROSIMS)** — An all-in-one OSINT platform for research, investigations, intelligence management, entity correlation, and interactive Node visualization.

---

## 🛰️ Overview & Core Concept

**ROSIMS** is a specialized, interactive Open Source Intelligence (OSINT) management environment designed for analysts, cybersecurity researchers, digital investigators, and threat intelligence operators. 

By structuring 1,457 OSINT tools and services into a **dynamic 2D physics-assisted Neural Mesh Network**, ROSIMS transforms fragmented bookmark collections into an active tactical intelligence ecosystem. Analysts can rapidly traverse intelligence categories, blossom target sub-tools, inspect live target domains, unblock framing security restrictions, and maintain real-time investigation case logs.

---

## 🌟 Core Features & Operational Capabilities

### 🌐 1. Interactive Neural Mesh Entity Visualization Engine
- **Core Intelligence Hub Node (`ROSIMS`)**: The central command node controlling global category expansion across the neural network.
- **Category Nodes (Violet Orbs)**: 78 curated OSINT intelligence domains (e.g., `DOMAIN / IP / DNS`, `DARKNET`, `MALWARE`, `SOCIAL MEDIA`, `THREAT INTEL`, `CRYPTOCURRENCY`, `PHONE & CONTACT`). Clicking a category node blossoms its underlying intelligence toolset.
- **Tool Nodes (Emerald Sparks)**: 1,457 active tool nodes. Clicking any tool node opens the integrated **OSINT Inspection & Webview Portal**.
- **Physics-Assisted Canvas Engine**: Custom 2D force-directed simulation featuring spring connection tension, dynamic node repulsion, velocity damping, draggable node positioning, smooth camera zoom, and panning controls.

### 🔓 2. Multi-Mode OSINT Webview & Frame Unblocker Proxy
Solves website framing and `X-Frame-Options` / `Content-Security-Policy` header blocks using three specialized viewing modes:
- **🛡️ OSINT Cyber Portal Mode**: Displays target security protocol tags, domain roots, quick WHOIS/DNS/URLScan links, direct launch triggers, and Web Archive snapshot lookups.
- **🖥️ Live Direct Embed Mode**: Renders frameable tools inside a clean, high-performance webview container.
- **🔓 Unblock Proxy Webview Mode**: Routes target URLs through the built-in ROSIMS Proxy (`proxy.py` on port 8081) to strip `X-Frame-Options` and `Content-Security-Policy` headers, enabling live in-app webview access for 100% of external websites (including GitHub, PyPI, state registries, etc.).

### 🔍 3. Tactical Instant Search Engine (`Ctrl + K`)
- High-speed fuzzy search across all 1,457 tools by name, domain, category, or functionality tag.
- Keyboard-driven navigation (`Up`/`Down`/`Enter`).
- Automatic camera recentering and node network auto-expansion upon selecting search items.

### 📝 4. Intel Investigation Scratchpad & Case Bookmarking
- **Investigation Scratchpad**: Integrated case logger persisted in `localStorage`. One-click insertion of active tool links, target identifiers, and evidence snippets, with one-click `.txt` case report export.
- **Pinned Favorites Drawer**: Bookmark frequently used OSINT tools for rapid tactical access during active investigations.

---

## 📁 System Architecture

```
ROSIMS/
├── index.html                   # Main interface, glassmorphic HUD, & drawer layouts
├── style.css                    # Obsidian Dark design system & neon cyber styling
├── data.js                      # Structured intelligence dataset (78 Categories, 1,457 Tools)
├── app.js                       # 2D Canvas Neural Mesh engine & application logic
├── proxy.py                     # Webview Proxy Server (strips X-Frame-Options & CSP headers)
├── parse_html.py                # Intelligence dataset extraction script
├── OSINT4ALL - Start.me.html    # Reference OSINT repository database
└── README.md                    # System documentation
```

---

## 🚀 Installation & Operating Guide

### 1. Launch ROSIMS Core Application
Run a local HTTP web server in the project directory:

```bash
python -m http.server 8080
```
Access the application interface at **`http://localhost:8080`**.

### 2. Launch Webview Unblock Proxy (Optional, For Restricted Sites)
To enable live iframe webview for sites that enforce `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`, start the ROSIMS proxy:

```bash
python proxy.py
```
*The proxy runs on `http://127.0.0.1:8081` and strips framing restrictions on demand.*

---

## ⌨️ Keyboard Shortcuts & Navigation Controls

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Tactical Search Engine |
| <kbd>Esc</kbd> | Close Overlay Modals & Drawers |
| <kbd>Space</kbd> / <kbd>R</kbd> | Recenter Camera View on ROSIMS Core Hub |
| <kbd>Mouse Drag</kbd> | Pan Camera / Move Graph Nodes |
| <kbd>Scroll Wheel</kbd> | Zoom In / Zoom Out Neural Mesh |

---

## 🛡️ Operational Mandate

ROSIMS is engineered for Research, Observation, Surveillance & Intelligence Management System operations. Ensure compliance with applicable legal frameworks and ethical OSINT practices during investigations.
