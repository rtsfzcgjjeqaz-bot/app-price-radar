# Inclusion Scoring System

## Overview

App Price Radar uses three complementary scoring systems to prioritise which data to keep freshest:

| Table | Granularity | Purpose |
|---|---|---|
| `app_scores` | Per app | How important is this app to track at all? |
| `country_scores` | Per country | How valuable is this country's pricing data? |
| `inclusion_scores` | Per app×country pair | Combined priority for a specific combination |

All scores are 0–100. Tiers: `critical` ≥ 80 · `high` ≥ 60 · `medium` ≥ 40 · `low` < 40.

---

## 1. App Scoring Model (`app_scores`)

Answers: *"How important is this app to keep updated?"*

### Formula

```
app_score = 0.40 × popularity_score
          + 0.25 × category_score
          + 0.20 × price_range_score
          + 0.15 × coverage_score
```

### Components

#### `popularity_score` (weight 40%)
Proxy for global search demand and App Store download rank. Assigned manually by tier:

| Tier | Score range | Examples |
|---|---|---|
| Streaming / AI flagship | 88–90 | ChatGPT, Spotify, Netflix, YouTube Premium |
| AI productivity | 80–85 | Claude, Canva, Duolingo, Disney+ |
| Mainstream productivity | 70–79 | Notion, Microsoft 365, Adobe Lightroom |
| Mid-tier | 55–69 | Todoist, Discord, NordVPN, Strava |
| Niche / dev tools | 20–54 | Proxyman, Working Copy, Google Maps |

#### `category_score` (weight 25%)
Strategic importance of the app's category to App Price Radar users:

| Category | Score |
|---|---|
| Productivity | 80 |
| Entertainment | 78 |
| Music | 72 |
| Health & Fitness | 70 |
| Education | 68 |
| Finance, Social | 65 |
| Design, Photo/Video, Games | 60–62 |
| Books | 58 |
| Utilities | 55 |
| Developer Tools | 42 |
| Travel | 38 |
| Navigation | 30 |

#### `price_range_score` (weight 20%)
Higher subscription price → larger absolute savings potential → more valuable to track.

```
price_range_score = min(100, round((base_price_usd / 30) × 100))
```

Examples: VSCO ($29.99) = 100 · ChatGPT ($19.99) = 67 · Bear ($2.99) = 10.

#### `coverage_score` (weight 15%)
How complete the price data is across all 20 tracked countries.

```
coverage_score = round((available_countries / 20) × 100)
```

Apps blocked in CN or RU lose coverage points.

### Top 10 App Scores

| App | Score | Tier |
|---|---|---|
| ChatGPT | 84.4 | **critical** |
| Netflix | 80.2 | **critical** |
| YouTube Premium | 78.4 | high |
| Coinbase | 75.3 | high |
| Max (HBO) | 75.1 | high |
| Claude | 74.4 | high |
| Spotify | 74.1 | high |
| VSCO | 74.0 | high |
| Microsoft 365 | 72.8 | high |
| Disney+ | 72.7 | high |

---

## 2. Country Scoring Model (`country_scores`)

Answers: *"How important is this country's pricing data?"*

### Formula

```
country_score = 0.35 × savings_potential
              + 0.30 × market_size
              + 0.20 × data_quality
              + 0.15 × user_demand
```

### Components

#### `savings_potential` (weight 35%)
How much cheaper this country is vs the US baseline. The most user-valuable signal.

```
savings_pct      = max(0, (1.0 − country_multiplier) × 100)
savings_potential = min(100, savings_pct × (100 / 88))
```

Argentina (12% of US price) normalises to 100.

#### `market_size` (weight 30%)
App Store user base and revenue weight. Even low-savings countries like the US and Japan need fresh data because most users are there.

| Country | Score | Rationale |
|---|---|---|
| US | 95 | Largest App Store market |
| JP | 80 | Second-largest App Store revenue |
| IN | 78 | Fastest-growing, large user base |
| GB, CA | 78–80 | Major English-speaking markets |
| DE, FR, AU | 68–75 | Large Western markets |
| TR, BR | 55–62 | Significant emerging markets |
| AR, EG | 42–48 | Small markets, very high savings |

#### `data_quality` (weight 20%)
Currency stability and price data reliability. Highly volatile currencies produce less trustworthy converted prices.

| Country | Score | Note |
|---|---|---|
| US, GB, DE, CA | 90–95 | Very stable currencies |
| JP, KR, SG, AU | 80–88 | Stable |
| IN, CN | 72–75 | Moderate stability |
| BR, MX | 60–65 | Moderate volatility |
| TR | 40 | High inflation / lira volatility |
| RU | 35 | Sanctions/restrictions |
| AR | 25 | Extreme inflation, parallel rates |

#### `user_demand` (weight 15%)
Inferred query volume for this country on App Price Radar (based on market size + English proficiency + known price-sensitive user behaviour).

### All 20 Country Scores

| Country | Score | Tier | Highlight |
|---|---|---|---|
| India | 78.2 | high | High savings + large growing market |
| Turkey | 64.4 | high | Extreme savings, mid market |
| Argentina | 62.2 | high | Highest savings, small market |
| United States | 61.8 | high | No savings but dominant market |
| Egypt | 59.8 | medium | High savings, smaller market |
| Mexico | 59.3 | medium | Good savings + sizeable market |
| Brazil | 58.2 | medium | Good savings + large market |
| United Kingdom | 53.7 | medium | Strong market, near-parity pricing |
| Japan | 52.95 | medium | Large market, near-parity pricing |
| China | 52.9 | medium | Large but restricted market |
| Russia | 52.7 | medium | Decent savings, data quality risk |
| Poland | 52.2 | medium | Good savings, mid market |
| Canada | 51.3 | medium | Strong market, slightly above US |
| Germany | 51.0 | medium | Large market, above US |
| France | 49.8 | medium | Similar to Germany |
| Taiwan | 49.8 | medium | 20% savings, mid market |
| South Korea | 49.1 | medium | 10% savings, large market |
| Australia | 48.8 | medium | 12% above US, strong market |
| Singapore | 45.5 | medium | 5% above US, small market |
| Hong Kong | 45.1 | medium | Near-parity, small market |

---

## 3. App×Country Pair Scoring (`inclusion_scores`)

The original combined model. See the formula and full table in `supabase/seeds/003_inclusion_scores.sql`.

```
pair_score = 0.35 × demand_score (≈ app popularity)
           + 0.30 × savings_score (country savings potential)
           + 0.20 × coverage_score (source quality)
           + 0.15 × market_score (country market size)
```

---

## Database Tables & Migration Order

```sql
-- Migrations (run in order):
001_initial_schema.sql
002_schema_fix.sql
003_price_source_tracking.sql
004_inclusion_scoring.sql        -- inclusion_scores table (pairs)
005_app_country_scores.sql       -- app_scores + country_scores tables (NEW)

-- Seeds (run after migrations):
001_base_data.sql
002_prices.sql
003_inclusion_scores.sql         -- 1,680 pair rows
004_app_scores.sql               -- 84 app rows (NEW)
005_country_scores.sql           -- 20 country rows (NEW)
```

---

## Regenerating Scores

```bash
node scripts/gen-scores.js
# Rewrites supabase/seeds/004_app_scores.sql
# Rewrites supabase/seeds/005_country_scores.sql
```

---

## Design Rationale

**Why separate app and country scores?**
The combined `inclusion_scores` table is good for pipeline scheduling at the pair level. But sometimes you need to answer a different question: "Which apps should we ensure have complete global coverage?" (→ `app_scores`) vs "Which countries should we manually verify first when prices change?" (→ `country_scores`). Separate tables make those queries trivial.

**Why India scores highest for countries?**
India combines high savings potential (~72% cheaper than US) with a large and fast-growing App Store user base — making it the highest-value country to keep accurate. Users in India and users researching India pricing are both numerous.

**Why ChatGPT scores highest for apps?**
ChatGPT has maximum popularity (90) in a high-value category (Productivity: 80) with the highest subscription price among AI apps ($19.99 → price_range_score 67) and full 20-country coverage. The combination pushes it to `critical` tier.
