#!/usr/bin/env python3
"""Synchronize the offline Easy/Moderate distractor rules from their JS source."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    index = ROOT / "index.html"
    source = index.read_text(encoding="utf-8")
    original = source
    for old, new in (
        ("豪门与国家队典型阵容，以及极著名历史首发 · 四选一", "现代与经典首发，覆盖更多球队 · 四选一"),
        ("Iconic modern and legendary historic XIs · Four choices", "Modern and classic XIs across more teams · Four choices"),
        ("Onces icónicos, actuales e históricos · Cuatro opciones", "Onces modernos y clásicos de más equipos · Cuatro opciones"),
    ):
        source = source.replace(old, new)
    start = source.index("  // Easy multiple choice")
    # The post-answer renderer lives between choice rules and renderGame.
    # Regenerating distractors must preserve that independent module.
    boundary = "  // Answer-reveal match context."
    end = source.index(boundary, start) if boundary in source[start:] else source.index("  function renderGame(){", start)
    rules = (ROOT / "scripts/easy_choices.js").read_text(encoding="utf-8")
    rules = "\n".join("  " + line if line else "" for line in rules.rstrip().splitlines()) + "\n"
    updated = source[:start] + rules + source[end:]
    if updated != original:
        index.write_text(updated, encoding="utf-8")
    print("Easy/Moderate choice rules synchronized: strict league and era-level constraints")


if __name__ == "__main__":
    main()
