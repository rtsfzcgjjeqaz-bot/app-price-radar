-- country_scores seed
-- score = 0.35*savings_potential + 0.30*market_size + 0.20*data_quality + 0.15*user_demand

insert into country_scores (country_code, score, savings_potential, market_size, data_quality, user_demand, tier, notes) values
('US',61.75,0,95,95,95,'high','Baseline market'),
('GB',53.7,0,80,90,78,'medium','Baseline market'),
('DE',51,0,75,90,70,'medium','Baseline market'),
('FR',49.8,0,72,90,68,'medium','Baseline market'),
('AU',48.8,0,70,88,68,'medium','Baseline market'),
('CA',51.3,0,75,90,72,'medium','Baseline market'),
('JP',52.95,2,80,85,75,'medium','Baseline market'),
('SG',45.5,0,62,88,62,'medium','Baseline market'),
('HK',45.05,3,60,85,60,'medium','Baseline market'),
('TW',49.75,23,58,78,58,'medium',''),
('KR',49.1,11,65,80,65,'medium',''),
('CN',52.9,14,70,75,80,'medium',''),
('IN',78.2,82,78,72,78,'high','High savings market'),
('TR',64.35,89,55,40,58,'high','High savings market'),
('BR',58.2,51,62,60,65,'medium',''),
('MX',59.3,59,58,65,55,'medium',''),
('AR',62.2,100,48,25,52,'high','High savings market'),
('PL',52.15,43,52,70,50,'medium',''),
('RU',52.7,80,40,35,38,'medium','High savings market'),
('EG',59.75,91,42,45,42,'medium','High savings market')
on conflict (country_code) do update set
  score=excluded.score, savings_potential=excluded.savings_potential,
  market_size=excluded.market_size, data_quality=excluded.data_quality,
  user_demand=excluded.user_demand, tier=excluded.tier,
  notes=excluded.notes, computed_at=now();
