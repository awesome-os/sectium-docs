# Sectium Docs (`awesome-os/sectium-docs`)

Canonical documentation, Central Label-Indexed Markdown Registry, collapsed architecture specifications, books, and development chronicle for the **Awesome-OS / Sectium** 4-layer sovereign stack.

## Contents

### 1. Central Label-Indexed Markdown Registry (`registry/`)
- [`registry/MARKDOWN-REGISTRY.json`](./registry/MARKDOWN-REGISTRY.json) — Machine-readable index of **3,076** workspace Markdown documents with byte sizes, SHA-256 content digests, titles, and semantic label counts (`book`: 133, `b8g-runtime`: 123, `wasi`: 78, `skill`: 74, `rule`: 53, `blog`: 30, `sectium-control-plane`: 24, `web-streams`: 23, `devops-signing`: 21, `root`: 19, `architecture`: 15, `holo-compiler`: 14, `section-readme`: 6).
- [`registry/index.mts`](./registry/index.mts) — Zero-dependency erasable TypeScript scanner, classifier, and deterministic registry builder.
- [`registry/registry.test.mts`](./registry/registry.test.mts) — Unit test suite verifying indexing, label classification, and deterministic output.

### 2. Collapsed Architecture Specifications (`architecture/`)
- [`architecture/SECTIUM-CLOUD-CONTROL-PLANE.md`](./architecture/SECTIUM-CLOUD-CONTROL-PLANE.md) — `5 KB` `B8G_ABI_MAGIC_V3` (`0x33564742`) central discovery `initramfs`, 1-way `WoL` warm-RAM `.b8p` checkpointing (`64`-byte aligned `B8G_ARENA_V1`), opaque peer multiplexing, and $O(1)$ `RollingReleaseManifest` rollback.
- [`architecture/SECTIUM-HOST-DEVICE-BOUNDARY.md`](./architecture/SECTIUM-HOST-DEVICE-BOUNDARY.md) — Power-Button-managed host device boundary, dual interchangeable NDJSON channels (`command` `ttyS0` + pure-art `display`), `SectiumDevToolsPlane` cross-tab Web Stream, and Kitty-Ink TUI sink.
- [`architecture/DEVOPS-BUILD-DISTRIBUTION-AND-SIGNING-GUIDE.md`](./architecture/DEVOPS-BUILD-DISTRIBUTION-AND-SIGNING-GUIDE.md) — `holo-compiler` Tier-A (`< 1 s`) vs. Tier-B static multi-OS release builds, zero-gatekeeper web installers (`install.ps1` / `install.sh`), `D:\Sectium` installer invariants, and OS vendor code-signing truth table.

### 3. Books (`books/`)
- ***The White Dragon Book — Collapsed Flat-Architecture Edition***:
  - [`books/white-dragon-book/README.md`](./books/white-dragon-book/README.md)
  - [`books/white-dragon-book/COLLAPSED-ARCHITECTURE-SYNTHESIS.md`](./books/white-dragon-book/COLLAPSED-ARCHITECTURE-SYNTHESIS.md)
- ***The Little White Dragon Book***:
  - [`books/little-white-dragon-book/the-power-button-and-the-flat-kingdom.md`](./books/little-white-dragon-book/the-power-button-and-the-flat-kingdom.md)

### 4. Development History Blog (`blog/`)
- [`blog/index.md`](./blog/index.md) — Full Awesome-OS development chronicle index.
- [`blog/27-the-great-collapse-sectium-cloud-control-plane-and-tiny-polyglot-engines.md`](./blog/27-the-great-collapse-sectium-cloud-control-plane-and-tiny-polyglot-engines.md) — **Dev Blog #27**: *The Great Collapse — Sectium Cloud Control Plane & Tiny Polyglot Engines*.

## License

BSD-3-Clause — see [`LICENSE`](./LICENSE).

## Quick Install & Run (Windows / Linux / macOS)

```sh
# Install / hydrate from v11 CAS via holo-pm
holo-pm install repository://github.com/awesome-os/sectium-docs@main

# Or project & run directly via holo-project (0-byte hardlink)
holo-project "project://cpp/sectium-docs?from=repository://github.com/awesome-os/sectium-docs@main"
```
