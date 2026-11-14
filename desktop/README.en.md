# Wylie AX Office — Desktop app (Windows)

> 한국어: [README.md](README.md)

Wylie AX Office as a double-click app, no PowerShell needed. The app starts the orchestrator server (`server/`) inside itself
and opens the virtual office in a window. The layout and the way of working follow Munder Difflin (no code was copied).

| Area | What it shows |
| --- | --- |
| Top | App name · mode · parallel tasks · clock · **language (한국어 / EN)** |
| Left | Pixel office (click a desk to select that agent). Added people sit in the annex at the bottom |
| Right | Command center — Tasks · Approvals · Ask me · Memory · Activity · Skills · Terminal · Monitor · Triggers · Graph tabs, the queue, the input box |
| Bottom | Agent cards — the lead, the 12 roles and added people (status, current task, usage, circuit breaker), **+ Add agent** |

## Install

1. Run `release/Wylie-AX-Office-Setup-<version>.exe`. The installer uses Korean on a Korean Windows and English otherwise.
2. **Windows SmartScreen** may warn you because the installer is not code-signed.
   Click [More info] → [Run anyway] to continue.
3. It installs for your user account only, so no administrator rights are needed (default `%LOCALAPPDATA%\Programs\Wylie AX Office`).
4. Start **Wylie AX Office** from the Start menu or the desktop.

## Before you start — sign in to Claude

The app calls the Claude Code CLI (`claude.exe`) that ships with the Claude desktop app on this PC (no API key; it uses your subscription).
If you are signed out, a banner appears at the top. Click **[Sign in]**: a PowerShell window opens; approve in the browser and paste
the code shown into that window. The banner disappears once it is confirmed.

When the Claude desktop app updates, its bundled Claude Code changes version and **you may be signed out.** If the banner comes back, sign in the same way.
AX Office finds the new Claude Code without a restart. Briefings sent while signed out don't start; the queue shows them as failed with a note.

## Handing over work

- **Message** (default): type in the input box and press Ctrl+Enter. It joins the queue and the lead's resident session answers one message at a time.
  Ask for status, or hand over work with a "Result: …" line — the lead turns it into a briefing and queues it.
- **Briefing form**: fill in result, context, constraints and question policy yourself; it goes straight into the queue. Drop files to attach them.
- **Folder attach**: pick a folder with [Folder] or drop a folder on the box; only the documents inside are uploaded, keeping the folder structure (up to 40). Executables and hidden folders are skipped.
- **Voice input**: browser speech recognition doesn't work inside the app, so use Windows voice typing (**Win+H**).
- One briefing runs at a time and the rest wait their turn. Items that have not started can be canceled from the queue.

## Tabs

| Tab | What it does |
| --- | --- |
| Tasks | Tasks of the current briefing with status (waiting, working, in QA, awaiting, done, on hold, failed) and the deliverable verdict |
| Approvals | Decisions for Jaeha — external sends, cost, deletion, scope change, committing numbers, **cost cap exceeded**, **circuit breaker resume**. Actor and reason required |
| Ask me | Questions the lead or agents asked. The lead reads an answer right away; an agent reads it at its next task |
| Memory · Activity · Skills | Each agent's memory file, the event log, available skills |
| Terminal | A **live log** per desk (start, text, tools, results, QA, done). **[Open terminal]** opens an interactive Claude Code session with that person's persona |
| Monitor | Usage (total, today, last 7 days, per agent against the daily budget, per task), the per-task cap and daily budget, circuit breaker reset |
| Triggers | Run a briefing automatically at a set time (weekly on chosen days, daily, or once). Turn on/off, run now, delete. Runs **only while the app is on**; triggers due while it was off are marked missed |
| Graph | The order of a briefing's tasks and their status as a graph. Earlier briefings can be picked too; click a node to select its owner |

## Cost safeguards

- **Per-task cap** (default $2): the task stops and an approval card appears. Approve to continue with double the cap; reject to put it on hold.
- **Daily budget** (per agent, default $5): 80% constrains (half the turns and cap), 100% stops.
- **Circuit breaker**: consecutive problems — 1 steer → 2 constrain → 3 stop. When work goes to a stopped person, a "Resume" approval card appears.
- Amounts are estimates reported by Claude Code, not an invoice.

## Adding people

**+ Add agent** at the bottom → pick one of 12 role templates (schedule, quality, docs, research, copy, content, data engineering, security,
mobile, accessibility, motion, customer support) and set a name in Korean and English. Up to 6 people. They join the lead's roster and get work
from the next briefing. You can remove someone only when they have no running or waiting tasks.

## Language

Switch with **한국어 / EN** at the top right. The screen, tray menu and notifications change together; in English the lead and agents are told
to write in English. Content that already exists, such as task titles and deliverables, is not translated. The setting is kept in `hive\settings.json`.

## Window and tray

- Closing the window keeps the app **running in the tray** (tasks keep going).
- Tray menu: Open / Open deliverables folder / Start with Windows (on/off) / **Quit**
- **Quit** stops the server and every claude child process (including interactive terminals). Tasks that were running are closed as "on hold" at the next start.
- Starting the app again while it runs brings the existing window to the front.
- With "Start with Windows" on, the app starts in the tray without a window when you sign in.

## Where data lives

Nothing is written to the install folder (no write access, and updates replace it).

| Content | Location |
| --- | --- |
| Task ledger, approvals, mailboxes, memory, events, queue, questions, settings (hive) | `Documents\Wylie AX Office\hive` |
| Deliverables and attachments | `Documents\Wylie AX Office\산출물` |
| App and server log | `Documents\Wylie AX Office\logs\office-server.log` |

The deliverables folder keeps its Korean name (`산출물`) in both languages so your data stays in one place.

## How it works

- The server runs on Electron's bundled Node (`ELECTRON_RUN_AS_NODE=1`) and binds to `127.0.0.1` only. Port 8787 (8788–8799 if busy).
- The mode is `claude_code`. For testing you can override with environment variables: `OFFICE_MODE=mock`,
  `OFFICE_HIVE_DIR`, `OFFICE_DELIVERABLES_DIR` (data location), `OFFICE_CONCURRENCY` (parallel tasks, default 2, max 3).
- Interactive terminals use node-pty (`@lydell/node-pty`, Windows ConPTY) and talk to the screen over a WebSocket. They open only from this PC's screen.
- The installer leaves out the live (Agent SDK) mode dependencies (260MB). Run the server from the repository to use live mode.

## Develop and build (from the repository root)

```bash
npm install
npm run desktop:dev     # build the screen, then run Electron
npm run desktop:build   # build the screen, then the installer → release/
npm run desktop:icon    # regenerate icons (desktop/scripts/make-icon.mjs)
```

- The installer contains `desktop/` (main process, icons), `server/` (without hive data or live dependencies), `dist/`, `.claude/agents`, `.claude/skills`.
  If the build PC has internal skills in `.claude/skills`, they are packed too — do not distribute the installer outside the company.
- Do not commit `release/`.

## Uninstall

Settings → Apps → Wylie AX Office → Uninstall. Work records and deliverables in `Documents\Wylie AX Office` stay (delete them yourself if you no longer need them).
