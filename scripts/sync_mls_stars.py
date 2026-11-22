#!/usr/bin/env python3
"""Embed reviewed MLS star XIs without changing the base frequency archive."""
import base64
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
    catalog = json.loads((ROOT / "data/mls_stars.json").read_text(encoding="utf-8"))
    crests = {}
    for key, value in catalog["clubs"].items():
        club = {k: v for k, v in value.items() if k != "crestPath"}
        if key in data["teams"]:
            assert data["teams"][key] == club, key
        data["teams"][key] = club
        crests[key] = value["crestPath"]
    for key, nation in catalog["nations"].items():
        if key in data["nations"]:
            assert data["nations"][key] == nation, key
        data["nations"][key] = nation
    fixtures = []
    for record in catalog["fixtures"]:
        assert record["team"] in data["teams"]
        assert len(record["players"]) == len({p["name"] for p in record["players"]}) == 11
        assert all(p["value"] in data["nations"] for p in record["players"])
        assert record["players"][-1]["role"] == "GK"
        assert sum(int(n) for n in record["formation"].split("-")) == 10
        fixture = {k: record[k] for k in ("id", "mode", "season", "tier", "team", "date", "versus", "formation", "competition", "source")}
        fixture["players"] = [{k: p[k] for k in ("role", "name", "value")} for p in record["players"]]
        fixtures.append(fixture)
    assert len({(f["team"], f["date"]) for f in fixtures}) == len(fixtures)
    data["mlsStars"] = fixtures
    source = source.replace(marker + old + ";\n", marker + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    marker = "  const CREST_PATH_OVERRIDES="
    old = source.split(marker, 1)[1].split(";\n", 1)[0]
    paths = json.loads(old) | crests
    source = source.replace(marker + old + ";\n", marker + json.dumps(paths, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    marker = "window.XI_UI_ASSETS = "
    old = source.split(marker, 1)[1].split(";\n", 1)[0]
    assets = json.loads(old)
    for code, asset in catalog["flags"].items():
        content = (ROOT / asset["path"]).read_bytes()
        assert content.startswith(b"\x89PNG\r\n\x1a\n")
        assets["flags"][code] = "data:image/png;base64," + base64.b64encode(content).decode("ascii")
    source = source.replace(marker + old + ";\n", marker + json.dumps(assets, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    if source != original:
        index.write_text(source, encoding="utf-8")
    print(f"MLS star XIs synchronized: {len(fixtures)} supplemental records, base archive unchanged")


if __name__ == "__main__":
    main()
