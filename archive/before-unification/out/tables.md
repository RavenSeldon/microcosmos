### Table 1. Leverage: what the player can change, by configuration

| Configuration | Seeds | Unwinnable | Doing nothing wins | Rescuable (doing nothing loses, some sequence wins) |
|---|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 500 | 0.6% | 8.2% | 91.2% |
| Basin fails on cumulative deficit (buffer 6) | 300 | 2.0% | 9.7% | 88.3% |
| Cumulative deficit, buffer 3 | 300 | 7.3% | 1.0% | 91.7% |
| No district-to-district events (hub only) | 300 | 2.7% | 8.3% | 89.0% |
| Family mix 60 / 25 / 15 (R / E / P) | 300 | 0.3% | 7.0% | 92.7% |
| Family mix 20 / 40 / 40 (R / E / P) | 300 | 1.7% | 7.7% | 90.7% |
| River one unit scarcer (slack -2) | 300 | 3.3% | 2.7% | 94.0% |
| River one unit looser (slack 0) | 300 | 0.0% | 30.0% | 70.0% |
| Fixed river of 60 for every world (uncalibrated) | 300 | 38.7% | 17.0% | 44.3% |

### Table 2. Which actions the rescuable worlds need (full-knowledge search)

| Configuration | Rescuable seeds | Winnable with no STRIKE | STRIKE required | Winnable with no SIGNAL | SIGNAL required | Mean share of all sequences that win |
|---|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 456 | 99.1% | 0.9% | 57.7% | 42.3% | 3.8% |
| Basin fails on cumulative deficit (buffer 6) | 265 | 99.2% | 0.8% | 21.9% | 78.1% | 3.0% |
| Cumulative deficit, buffer 3 | 275 | 97.8% | 2.2% | 5.5% | 94.5% | 1.5% |
| No district-to-district events (hub only) | 267 | 98.9% | 1.1% | 55.4% | 44.6% | 3.2% |
| Family mix 60 / 25 / 15 (R / E / P) | 278 | 98.2% | 1.8% | 66.5% | 33.5% | 6.5% |
| Family mix 20 / 40 / 40 (R / E / P) | 272 | 99.6% | 0.4% | 53.7% | 46.3% | 1.6% |
| River one unit scarcer (slack -2) | 282 | 98.2% | 1.8% | 33.3% | 66.7% | 2.4% |
| River one unit looser (slack 0) | 210 | 99.5% | 0.5% | 82.4% | 17.6% | 4.6% |
| Fixed river of 60 for every world (uncalibrated) | 133 | 93.2% | 6.8% | 37.6% | 62.4% | 3.0% |

### Table 3. Observation-limited bots at baseline (500 seeds)

| Bot | Wins, all seeds | Wins, rescuable seeds | Lost station | Lost basin | Lost district | Mean unmet need (units) | Mean strikes | Mean signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 8.2% | 0.0% | 0.0% | 91.8% | 0.0% | 1.53 | 0.00 | 0.00 |
| strike every round | 0.2% | 0.2% | 76.6% | 68.6% | 0.0% | 4.98 | 2.85 | 0.00 |
| alternate strike | 5.4% | 5.7% | 24.0% | 72.4% | 0.0% | 3.01 | 1.52 | 0.00 |
| reactive strike | 6.0% | 5.9% | 43.8% | 50.2% | 0.0% | 4.43 | 2.03 | 0.00 |
| cooperate, hide when exposed | 37.4% | 33.8% | 0.0% | 62.6% | 0.0% | 3.36 | 0.00 | 2.36 |
| cooperate loudly | 8.4% | 7.9% | 71.8% | 28.0% | 0.0% | 3.19 | 0.00 | 3.96 |
| listen once, then cooperate | 39.2% | 34.9% | 0.0% | 60.8% | 0.0% | 3.04 | 0.00 | 2.13 |
| listen before every offer | 20.6% | 14.5% | 0.0% | 79.4% | 0.0% | 2.31 | 0.00 | 0.74 |
| informed mixed, no listen | 46.4% | 43.4% | 1.0% | 53.2% | 0.0% | 3.72 | 0.00 | 2.93 |
| informed mixed | 46.2% | 42.5% | 0.8% | 53.6% | 0.0% | 3.39 | 0.03 | 2.40 |
| random (mean of 20) | 4.9% | 4.2% | 53.7% | 64.4% | 0.0% | 2.56 | 1.11 | 1.14 |

### Table 4. Bot win rate on rescuable seeds, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 0.0% | 0.2% | 5.7% | 5.9% | 33.8% | 7.9% | 34.9% | 14.5% | 43.4% | 42.5% | 4.2% |
| Basin fails on cumulative deficit (buffer 6) | 0.0% | 0.0% | 0.0% | 0.0% | 41.1% | 6.8% | 44.5% | 17.7% | 44.2% | 44.5% | 3.3% |
| Cumulative deficit, buffer 3 | 0.0% | 0.4% | 0.0% | 0.0% | 18.9% | 5.5% | 22.2% | 5.8% | 19.6% | 24.0% | 1.6% |
| No district-to-district events (hub only) | 0.0% | 0.4% | 4.5% | 6.7% | 21.3% | 7.1% | 32.6% | 10.1% | 36.0% | 39.7% | 3.4% |
| Family mix 60 / 25 / 15 (R / E / P) | 0.0% | 0.4% | 8.6% | 6.5% | 38.8% | 15.1% | 46.8% | 22.7% | 51.1% | 51.8% | 7.1% |
| Family mix 20 / 40 / 40 (R / E / P) | 0.0% | 0.0% | 1.5% | 1.1% | 27.2% | 1.5% | 26.5% | 8.5% | 36.0% | 32.0% | 1.7% |
| River one unit scarcer (slack -2) | 0.0% | 0.0% | 2.8% | 3.2% | 22.0% | 6.0% | 23.4% | 8.9% | 25.5% | 24.8% | 2.8% |
| River one unit looser (slack 0) | 0.0% | 0.0% | 5.2% | 6.7% | 44.8% | 6.7% | 46.2% | 22.4% | 60.0% | 55.7% | 5.0% |
| Fixed river of 60 for every world (uncalibrated) | 0.0% | 0.0% | 2.3% | 4.5% | 30.8% | 4.5% | 27.1% | 16.5% | 32.3% | 34.6% | 3.8% |

### Table 5. Bot win rate on all seeds, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 8.2% | 0.2% | 5.4% | 6.0% | 37.4% | 8.4% | 39.2% | 20.6% | 46.4% | 46.2% | 4.9% |
| Basin fails on cumulative deficit (buffer 6) | 9.7% | 0.3% | 0.0% | 0.3% | 45.0% | 9.3% | 48.3% | 25.0% | 47.7% | 48.3% | 4.6% |
| Cumulative deficit, buffer 3 | 1.0% | 0.3% | 0.0% | 0.3% | 18.0% | 5.7% | 21.3% | 6.3% | 19.0% | 23.0% | 1.7% |
| No district-to-district events (hub only) | 8.3% | 0.3% | 4.0% | 6.3% | 24.0% | 7.0% | 33.7% | 13.3% | 36.7% | 40.7% | 3.9% |
| Family mix 60 / 25 / 15 (R / E / P) | 7.0% | 0.3% | 8.0% | 6.3% | 41.7% | 15.0% | 48.7% | 27.0% | 53.3% | 54.0% | 7.3% |
| Family mix 20 / 40 / 40 (R / E / P) | 7.7% | 0.0% | 1.7% | 1.3% | 31.3% | 1.7% | 31.7% | 14.3% | 39.3% | 36.0% | 2.1% |
| River one unit scarcer (slack -2) | 2.7% | 0.0% | 2.7% | 3.0% | 23.3% | 5.7% | 24.3% | 11.0% | 26.7% | 26.0% | 2.9% |
| River one unit looser (slack 0) | 30.0% | 0.7% | 5.7% | 11.0% | 58.3% | 10.3% | 62.0% | 43.0% | 70.0% | 68.3% | 8.2% |
| Fixed river of 60 for every world (uncalibrated) | 17.0% | 0.7% | 3.0% | 10.7% | 30.7% | 6.0% | 28.7% | 24.3% | 31.3% | 32.3% | 4.6% |

### Table 7. Fewest SIGNALs or STRIKEs in any winning line, rescuable seeds (full-knowledge search)

| Configuration | One | Two | Three | Four or more |
|---|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 72.6% | 24.1% | 3.1% | 0.2% |
| Basin fails on cumulative deficit (buffer 6) | 69.1% | 22.6% | 6.8% | 1.5% |
| Cumulative deficit, buffer 3 | 45.1% | 35.6% | 16.0% | 3.3% |
| No district-to-district events (hub only) | 49.8% | 44.6% | 4.9% | 0.7% |
| Family mix 60 / 25 / 15 (R / E / P) | 86.0% | 13.3% | 0.4% | 0.4% |
| Family mix 20 / 40 / 40 (R / E / P) | 58.5% | 35.7% | 5.5% | 0.4% |
| River one unit scarcer (slack -2) | 56.0% | 36.9% | 6.7% | 0.4% |
| River one unit looser (slack 0) | 88.6% | 10.5% | 1.0% | 0.0% |
| Fixed river of 60 for every world (uncalibrated) | 53.4% | 26.3% | 15.8% | 4.5% |

### Table 6. How often each bot loses a district to deprivation, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Basin fails on cumulative deficit (buffer 6) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.1% |
| Cumulative deficit, buffer 3 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| No district-to-district events (hub only) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Family mix 60 / 25 / 15 (R / E / P) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Family mix 20 / 40 / 40 (R / E / P) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| River one unit scarcer (slack -2) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| River one unit looser (slack 0) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.1% |
| Fixed river of 60 for every world (uncalibrated) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
