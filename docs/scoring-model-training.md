# Scoring Model Training

## Goal

Replace hand-tuned static scores (the `inclusion_scores`, `app_scores`, `country_scores` tables) with a **learned priority model** that predicts which app×country pages will generate the most clicks and impressions, so the crawl pipeline and editorial team focus effort where it has the most user impact.

---

## What Data to Collect

Three tables feed the training pipeline:

### 1. `page_metrics` — on-site engagement

Collected from your analytics provider (Plausible, PostHog, Vercel Analytics):

| Field | Source | Notes |
|---|---|---|
| `page_url` | Analytics event | Full path e.g. `/apps/spotify` |
| `app_id`, `country_code` | Parsed from URL | `/apps/{app_id}`, `/countries/{cc}` |
| `views` | Page view count | Aggregate per day |
| `clicks` | CTA / outbound clicks | App Store links, plan selector interactions |
| `engagement_rate` | Time-on-page or scroll depth | Provider-specific, normalise 0–1 |

Minimum collection period before training: **4 weeks** (to capture weekly seasonality).

### 2. `search_console_metrics` — organic search signals

Collected from the [Google Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index):

| Field | Source | Notes |
|---|---|---|
| `query` | GSC search query | e.g. "cheapest spotify country" |
| `impressions` | GSC | How often the page appeared in search results |
| `clicks` | GSC | How often users clicked through |
| `ctr` | GSC | clicks / impressions |
| `position` | GSC | Average rank position |

Export daily via `searchanalytics.query` endpoint, filtered to your verified property. Minimum: **8 weeks** of data.

### 3. `scoring_training_examples` — the ML dataset

Built by a weekly batch job that:
1. Snapshots all current signal values into `features` (JSONB)
2. Waits for the observation window to close (7 days for clicks, 30 days for impressions)
3. Back-fills `target_clicks_7d` and `target_impressions_30d`
4. Derives `label` based on thresholds

---

## Feature Specification

The `features` JSONB column should contain a flat dictionary of numeric and categorical signals:

```json
{
  "inclusion_score": 79.75,
  "demand_score": 90,
  "savings_score": 81.82,
  "coverage_score": 60,
  "market_score": 78,
  "app_score": 74.1,
  "country_score": 78.2,
  "source_type_encoded": 1,
  "confidence_level_encoded": 2,
  "price_usd": 2.79,
  "price_delta_pct_30d": -2.1,
  "prev_views_7d": 142,
  "prev_clicks_7d": 8,
  "prev_impressions_30d": 412,
  "avg_position_30d": 14.3,
  "is_default_plan": 1,
  "billing_period_encoded": 0
}
```

**Encoding map:**
- `source_type`: `itunes_lookup=2`, `manual_seed=1`, `community=0`
- `confidence_level`: `high=2`, `medium=1`, `low=0`
- `billing_period`: `monthly=3`, `annual=2`, `one_time=1`, `free=0`

---

## Target Variables

| Variable | Definition | Threshold → label |
|---|---|---|
| `target_clicks_7d` | On-site page clicks in 7 days after snapshot | ≥10 → high, 3–9 → medium, <3 → low |
| `target_impressions_30d` | GSC impressions in 30 days after snapshot | ≥500 → high, 100–499 → medium, <100 → low |

Final label: `high` if **either** threshold is met at the high level, `low` if **both** are at the low level, otherwise `medium`.

---

## Recommended Model

### Phase 1 — Gradient Boosted Trees (when data is available)

**Model:** XGBoost or LightGBM  
**Task:** Multi-class classification (high / medium / low)  
**Why:** Handles mixed numeric/categorical features, robust to missing values, interpretable via feature importance, no normalisation required, fast to train on small datasets.

```python
# Minimal training example (Python)
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

df = pd.read_sql("SELECT features, label FROM scoring_training_examples WHERE label IS NOT NULL", conn)
X = pd.json_normalize(df['features'])
y = df['label'].map({'high': 2, 'medium': 1, 'low': 0})

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1)
model.fit(X_train, y_train)
print("Accuracy:", model.score(X_test, y_test))
```

### Phase 2 — Online learning (as data grows)

Once you have 6+ months of data, retrain weekly using a rolling window. Consider a regression model targeting `target_clicks_7d` directly (instead of classification) for finer-grained priority ordering.

---

## Minimum Data Needed to Train

| Requirement | Threshold |
|---|---|
| Minimum labelled training examples | 500 rows |
| Minimum time coverage | 8 weeks |
| Minimum apps represented | 20 |
| Minimum countries represented | 10 |
| Class balance (high:medium:low) | No class should be <10% of total |

At current scale (85 apps × 20 countries = 1,700 pairs), weekly snapshots would produce ~1,700 examples/week. At this rate, the minimum dataset is reachable **in 1 week** once collection starts — but 4–8 weeks is recommended for seasonal stability.

---

## Collection Timeline

```
Week 1–4:    Collect page_metrics and search_console_metrics.
             No training yet — not enough signal diversity.

Week 5–8:    Begin creating scoring_training_examples weekly.
             Targets back-filled for week 1–4 observations.

Week 9+:     First training run possible.
             Deploy model as scoring override in crawl_jobs priority.

Month 6+:    Retrain monthly with rolling 6-month window.
             Consider regression model for continuous priority scores.
```

---

## SQL: Creating a Training Batch

```sql
insert into scoring_training_examples
  (app_id, country_code, features, observation_window_start, observation_window_end)
select
  i.app_id,
  i.country_code,
  jsonb_build_object(
    'inclusion_score',      i.score,
    'demand_score',         i.demand_score,
    'savings_score',        i.savings_score,
    'coverage_score',       i.coverage_score,
    'market_score',         i.market_score,
    'app_score',            a.score,
    'country_score',        c.score,
    'price_usd',            cp.price * er.rate_to_usd,
    'prev_views_7d',        coalesce(pm.views, 0),
    'prev_impressions_30d', coalesce(gsc.impressions, 0)
  ),
  current_date,
  current_date + 7
from inclusion_scores i
left join app_scores      a   on a.app_id = i.app_id
left join country_scores  c   on c.country_code = i.country_code
left join current_prices  cp  on cp.app_id = i.app_id and cp.country_code = i.country_code
left join exchange_rates  er  on er.currency = cp.currency
left join (
  select app_id, country_code, sum(views) as views
  from page_metrics
  where date >= current_date - 7
  group by app_id, country_code
) pm on pm.app_id = i.app_id and pm.country_code = i.country_code
left join (
  select page_url, sum(impressions) as impressions
  from search_console_metrics
  where date >= current_date - 30
  group by page_url
) gsc on gsc.page_url = '/apps/' || i.app_id
on conflict (app_id, country_code, observation_window_start) do nothing;
```

---

## Database Tables (added in migration 008)

| Table | Purpose |
|---|---|
| `page_metrics` | Daily on-site views, clicks, engagement per page |
| `search_console_metrics` | Daily GSC impressions, clicks, CTR, position per query+page |
| `scoring_training_examples` | ML training rows: feature snapshot + future targets |
