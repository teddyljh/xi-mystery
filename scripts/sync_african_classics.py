#!/usr/bin/env python3
"""Embed reviewed African classic XIs, reusing archived matches by ID."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    index = ROOT / "index.html"
    source = index.read_text(encoding="utf-8")
    original = source
    marker = "window.LINEUP_DATA = "
    old = source.split(marker, 1)[1].split(";\n", 1)[0]
    data = json.loads(old)
    catalog = json.loads((ROOT / "data/african_classics.json").read_text(encoding="utf-8"))
    assert {f["team"] for f in catalog["fixtures"]} == {"MAR", "SEN", "NGA", "CIV", "EGY", "CMR"}
    crests = {}
    for key, value in catalog["clubs"].items():
        club = {k: v for k, v in value.items() if k != "crestPath"}
        if key in data["teams"]:
            assert data["teams"][key] == club, key
        data["teams"][key] = club
        crests[key] = value["crestPath"]
    entries = []
    for record in catalog["fixtures"]:
        assert record["mode"] == "nation" and record["team"] in data["nations"]
        assert len(record["players"]) == len({p["name"] for p in record["players"]}) == 11
        assert all(p["value"] in data["teams"] for p in record["players"])
        assert record["players"][-1]["role"] == "GK"
        assert sum(int(n) for n in record["formation"].split("-")) == 10
        players = [{k: p[k] for k in ("role", "name", "value")} for p in record["players"]]
        existing = [f for f in data["fixtures"] if f["mode"] == "nation" and (f["team"], f["date"]) == (record["team"], record["date"])]
        if existing:
            canonical = next((f for f in existing if not f["id"].endswith("-medium")), existing[0])
            assert canonical["formation"] == record["formation"] and canonical["players"] == players
            entries.append(canonical["id"])
        else:
            assert not record.get("reuseId"), record["id"]
            fixture = {k: record[k] for k in ("id", "mode", "season", "tier", "team", "date", "versus", "formation", "competition", "source")}
            entries.append(fixture | {"players": players})
    assert len({(f["team"], f["date"]) for f in catalog["fixtures"]}) == len(entries)
    data["africanClassics"] = entries
    source = source.replace(marker + old + ";\n", marker + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    marker = "  const CREST_PATH_OVERRIDES="
    old = source.split(marker, 1)[1].split(";\n", 1)[0]
    paths = json.loads(old) | crests
    source = source.replace(marker + old + ";\n", marker + json.dumps(paths, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    # Some defunct clubs need their actual historical crest rather than the
    # similarly named modern club in the shared logo collection.
    old = "    const urls=CREST_HOSTS.map(host=>host+encodePath(path));"
    new = "    const urls=/^https:\\/\\//.test(path)?[path]:CREST_HOSTS.map(host=>host+encodePath(path));"
    if old in source:
        source = source.replace(old, new, 1)
    assert new in source
    if source != original:
        index.write_text(source, encoding="utf-8")
    print(f"African classics synchronized: {len(entries)} XIs, {sum(isinstance(f, str) for f in entries)} reused; base archive unchanged")


if __name__ == "__main__":
    main()
