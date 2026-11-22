#!/usr/bin/env python3
"""Embed World Cup/EURO finals for the curated difficulty pools."""
from pathlib import Path
import json
from upgrade_hard import EASY_FAMOUS_NATIONS

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_KEYS = ("id", "mode", "season", "tier", "team", "date", "versus", "formation", "competition", "source")


def runtime_fixture(record: dict) -> dict:
    return {key: record[key] for key in RUNTIME_KEYS} | {
        "players": [{key: p[key] for key in ("role", "name", "value")} for p in record["players"]]
    }


def write_review(records: list, data: dict) -> None:
    easy_count = sum(f["team"] in EASY_FAMOUS_NATIONS for f in records)
    lines = ["# 2002—2026年世界杯、欧洲杯决赛首发", "",
             f"世界杯7届、欧洲杯6届，共13场决赛、26套首发，全部在 Medium 和 Hard 中各出现一次；Easy 按当前准入范围保留{easy_count}套。17套复用已有题目，9套补充首发单独保存。欧洲杯2020届的实际决赛日期为2021-07-11。", "",
             "新增首发按欧足联、FIFA及足协官方资料核对，历史俱乐部线索采用赛事报名/当时官方名单，未使用球员现在的俱乐部。游戏阵型用于位置排列。Medium、Hard题干保留完整的首发说明句和日期高亮，不显示世界杯、欧洲杯等赛事名称；隐藏与提示由既定题库规则处理。", ""]
    for record in records:
        existing = next((f for f in data["fixtures"] if f["mode"] == "nation" and (f["team"], f["date"]) == (record["team"], record["date"])), None)
        fixture = existing or runtime_fixture(record)
        event = "世界杯" if record["event"] == "WORLD_CUP" else "欧洲杯"
        status = "已有，复用" if existing else "补充首发"
        status += "；Easy/Medium/Hard" if record["team"] in EASY_FAMOUS_NATIONS else "；仅 Medium/Hard"
        lines += [f"## {event}{record['eventYear']} · {record['date']} · {data['nations'][record['team']]['zh']} · {status}", "",
                  f"阵型：{fixture['formation']} · [比赛及首发来源]({record['source']})", "",
                  "；".join(f"{p['name']}（{data['teams'][p['value']]['zh']}，{p['role']}）" for p in fixture["players"]), ""]
        if record.get("officialLineupSource"):
            lines += [f"[官方首发资料]({record['officialLineupSource']})", ""]
        if record.get("clubSources"):
            lines += ["俱乐部资料：" + "、".join(f"[来源{i + 1}]({url})" for i, url in enumerate(record["clubSources"])), ""]
    output = ROOT / "docs/national-finals-2002-2026.md"
    output.parent.mkdir(exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    index = ROOT / "index.html"
    source = index.read_text(encoding="utf-8")
    original = source
    marker = "window.LINEUP_DATA = "
    old_data = source.split(marker, 1)[1].split(";\n", 1)[0]
    data = json.loads(old_data)
    catalog = json.loads((ROOT / "data/national_finals.json").read_text(encoding="utf-8"))
    records = catalog["fixtures"]
    assert len(records) == 26
    assert len({(f["team"], f["date"]) for f in records}) == 26
    assert {f["eventYear"] for f in records if f["event"] == "WORLD_CUP"} == set(range(2002, 2027, 4))
    assert {f["eventYear"] for f in records if f["event"] == "EURO"} == {2004, 2008, 2012, 2016, 2020, 2024}
    crests = dict(catalog["crestPaths"])
    for key, club in catalog["clubs"].items():
        value = {name: value for name, value in club.items() if name != "crestPath"}
        if key in data["teams"]:
            assert data["teams"][key] == value, f"Conflicting club: {key}"
        else:
            data["teams"][key] = value
        crests[key] = club["crestPath"]
    entries = []
    new_count = 0
    for record in records:
        fixture = runtime_fixture(record)
        assert fixture["team"] in data["nations"]
        assert len(fixture["players"]) == 11
        assert len({p["name"] for p in fixture["players"]}) == 11
        assert all(p["value"] in data["teams"] for p in fixture["players"])
        existing = [f for f in data["fixtures"] if f["mode"] == "nation" and (f["team"], f["date"]) == (fixture["team"], fixture["date"])]
        if existing:
            canonical = next((f for f in existing if not f["id"].endswith("-medium")), existing[0])
            entries.append(canonical["id"])
        else:
            entries.append(fixture)
            new_count += 1
    data["nationalFinals"] = entries
    write_review(records, data)
    source = source.replace(marker + old_data + ";\n", marker + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    crest_marker = "  const CREST_PATH_OVERRIDES="
    old_crests = source.split(crest_marker, 1)[1].split(";\n", 1)[0]
    paths = json.loads(old_crests)
    paths.update(crests)
    source = source.replace(crest_marker + old_crests + ";\n", crest_marker + json.dumps(paths, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    if source != original:
        index.write_text(source, encoding="utf-8")
    print(f"National finals synchronized: 26 XIs, {new_count} supplemental, {len(entries) - new_count} reused; base archive unchanged")


if __name__ == "__main__":
    main()
