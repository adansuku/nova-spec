<!--
  context/decisions/archived/ — Superseded decisions.

  Files here are decisions that were REPLACED by a newer decision at
  the parent level (../<concept>.md). They are NEVER loaded by the AI
  agent on tickets, but they remain in git so future readers can see
  what we used to think and why we changed our minds.

  NEVER delete a decision file. Always `git mv` from the parent
  directory into here when superseded.

  Guardrail #6 (`old-decision-archived`) refuses /nova-wrap if a
  decision with `> Supersedes: X.md` exists at the parent level while
  X.md is still at the parent (not moved here).
-->

# Archived decisions

This folder holds decisions that have been superseded. They stay in git
forever as historical record. The AI agent skips this folder entirely.
