# Data quality report

_Generated 2026-05-29T16:23:18.188Z — private/local-only, not for distribution._

- **Dataset source:** mock (no ingested data yet)
- **Teams:** 48
- **Players:** 46
- **Matches:** 72
- **Venues:** 16

## Schema validation

| Schema | Total | Valid | Invalid |
| --- | --- | --- | --- |
| TeamSchema | 48 | 48 | 0 |
| VenueSchema | 16 | 16 | 0 |
| PlayerSchema | 46 | 46 | 0 |
| MatchSchema | 72 | 72 | 0 |
| StandingSchema | 48 | 48 | 0 |

- **Total invalid records:** 0

## Coverage gaps

- **Players missing club:** 0
- **Players missing age:** 0
- **Players missing shirt number:** 0
- **Matches missing venue:** 0
- **Teams missing ranking:** 0

## Duplicate ids

- **Duplicate team codes:** none
- **Duplicate player ids:** none
- **Duplicate match ids:** none

## Local SQLite store

- **DB exists:** yes
- **teams rows:** 48
- **players rows:** 46
- **matches rows:** 72
- **venues rows:** 16
- **asset_registry rows:** 96
- **assets by type:** crest:48, flag:48
