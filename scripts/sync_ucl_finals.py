#!/usr/bin/env python3
"""Embed the reviewed 2002–2026 UEFA final catalog without cloning base XIs.

The data file stores official player IDs, jersey numbers and sources. Runtime
fixtures omit audit-only fields; existing matches are referenced by ID. New
Finals stay separate from the base archive used by the frequency heuristic.
"""
from pathlib import Path
import json
from upgrade_hard import EASY_FAMOUS_CLUBS

ROOT = Path(__file__).resolve().parents[1]
CORRECTED = {("porto", "2004-05-26"), ("monaco", "2004-05-26"), ("atletico", "2016-05-28")}
SUBTITLE = r"""    const subtitle=$('game-subtitle');
    const [yyyy,mm,dd]=(f.date||'').split('-');
    const prettyDate=state.lang==='zh'&&yyyy&&mm&&dd?`${yyyy}年${Number(mm)}月${Number(dd)}日`:f.date;
    const dateEl=document.createElement('strong');
    dateEl.className='match-date-highlight';
    dateEl.textContent=prettyDate;
    const competition=state.difficulty==='easy'?competitionName(f.competition):'';
    const prefix=state.lang==='zh'?'这是这只球队在':state.lang==='es'?'Esta es la alineación titular del equipo del ':'This is the team’s starting XI from ';
    const suffix=state.lang==='zh'?(competition?`（${competition}）的首发阵容。`:'的首发阵容。'):state.lang==='es'?(competition?` (${competition}).`:'.'):(competition?` (${competition}).`:'.');
    subtitle.replaceChildren(document.createTextNode(prefix),dateEl,document.createTextNode(suffix));
"""


def runtime_fixture(fixture: dict) -> dict:
    return {key: value for key, value in fixture.items() if key not in {"uefaMatchId", "officialLineupSource", "players"}} | {
        "players": [{key: player[key] for key in ("role", "name", "value")} for player in fixture["players"]]
    }


def write_review(finals: list, data: dict) -> None:
    easy_count = sum(f["team"] in EASY_FAMOUS_CLUBS for f in finals)
    lines = ["# 2002—2026年欧冠决赛首发", "",
             f"25场决赛、50套首发均保留在 Medium 和 Hard；Easy 按豪门范围保留{easy_count}套。既有28套首发按球队和比赛日期复用，22套补充首发单独保存，不重复添加。", "",
             "首发名单、球员编号和国籍已核对欧足联官方比赛及首发接口；位置按战术图整理，阵型为游戏使用的排列。2004年波尔图、摩纳哥和2016年马竞的旧题已按实际首发更正。", ""]
    for year in range(2002, 2027):
        pair = [f for f in finals if f["date"].startswith(str(year))]
        assert len(pair) == 2
        lines += [f"## {pair[0]['date']}：{data['teams'][pair[0]['team']]['zh']} vs {data['teams'][pair[1]['team']]['zh']}", "",
                  f"[欧足联比赛记录]({pair[0]['source']}) · [官方首发数据]({pair[0]['officialLineupSource']})", ""]
        for f in pair:
            existing = [x for x in data["fixtures"] if x["mode"] == "club" and (x["team"], x["date"]) == (f["team"], f["date"])]
            status = "补充首发" if not existing else "已有，复用"
            status += "；Easy/Medium/Hard" if f["team"] in EASY_FAMOUS_CLUBS else "；仅 Medium/Hard"
            lines += [f"**{data['teams'][f['team']]['zh']} · {f['formation']} · {status}**", "",
                      "；".join(f"{p['name']}（{data['nations'][p['value']]['zh']}，{p['role']}）" for p in f["players"]), ""]
    output = ROOT / "docs/ucl-finals-2002-2026.md"
    output.parent.mkdir(exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    index = ROOT / "index.html"
    source = index.read_text(encoding="utf-8")
    original = source
    marker = "window.LINEUP_DATA = "
    old_data = source.split(marker, 1)[1].split(";\n", 1)[0]
    data = json.loads(old_data)
    finals = json.loads((ROOT / "data/ucl_finals.json").read_text(encoding="utf-8"))
    assert len(finals) == 50
    assert {f["date"][:4] for f in finals} == {str(year) for year in range(2002, 2027)}
    assert len({(f["team"], f["date"]) for f in finals}) == 50
    entries = []
    new_count = 0
    for record in finals:
        fixture = runtime_fixture(record)
        assert len(fixture["players"]) == 11
        existing = [f for f in data["fixtures"] if f["mode"] == "club" and (f["team"], f["date"]) == (fixture["team"], fixture["date"])]
        if existing:
            canonical = next((f for f in existing if not f["id"].endswith("-medium")), existing[0])
            if (fixture["team"], fixture["date"]) in CORRECTED:
                for match in existing:
                    for key in ("formation", "players", "source"):
                        match[key] = fixture[key]
            entries.append(canonical["id"])
        else:
            assert fixture["team"] in data["teams"]
            assert all(p["value"] in data["nations"] for p in fixture["players"])
            entries.append(fixture)
            new_count += 1
    data["uclFinals"] = entries
    write_review(finals, data)
    source = source.replace(marker + old_data + ";\n", marker + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", 1)
    start = source.index("    const subtitle=$('game-subtitle');", source.index("  function renderGame(){"))
    end = source.index("    $('round-value').textContent=", start)
    source = source[:start] + SUBTITLE + source[end:]
    source = source.replace("tr('totalCount')(DATA.fixtures.length)", "tr('totalCount')(quizFixtureCount())")
    if source != original:
        index.write_text(source, encoding="utf-8")
    print(f"UEFA finals synchronized: 50 XIs, {new_count} new records; existing XIs reused; full subtitles retain highlighted dates without Medium/Hard competition clues")


if __name__ == "__main__":
    main()
