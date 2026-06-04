export const en = {
  // Nav
  nav_search: 'Search',
  nav_ai: 'AI',
  nav_app_ranking: 'App Ranking',
  nav_country_ranking: 'Country Ranking',
  nav_data_sources: 'Data Sources',
  nav_lang_en: 'EN',
  nav_lang_zh: '中文',

  // Hero
  hero_badge: 'Daily updated global App Store prices',
  hero_headline: 'Compare App Store Prices Worldwide',
  hero_subheadline: 'Find the cheapest country for ChatGPT, Spotify, Canva, Netflix, and more.',
  hero_search_placeholder: 'Search apps, countries, or ask AI...',
  hero_browse_us: 'Browse US Store',
  popular_searches: 'Popular:',

  // Stats
  stat_apps: 'Apps Tracked',
  stat_countries: 'Countries',
  stat_prices: 'Price Points',
  stat_currencies: 'Currencies',

  // Sections
  section_popular: '🔥 Popular Apps',
  section_best_value: '💸 Best Value Apps',
  section_best_value_sub: 'Sorted by lowest global price',
  section_recent: '🕒 Recently Updated',
  section_view_all: 'View all',

  // Why Use
  why_title: 'Why Use App Price Radar',
  why_1_title: 'Global Price Comparison',
  why_1_desc: 'Compare App Store prices across 20+ countries in one place. No more manual searching.',
  why_2_title: 'AI-Powered Insights',
  why_2_desc: 'Ask natural language questions about pricing. Get instant answers with data.',
  why_3_title: 'Daily Updated Pricing',
  why_3_desc: 'Prices are updated daily via Apple\'s official iTunes Lookup API.',

  // Search page
  search_title: 'Search',
  search_placeholder: 'Search apps or countries...',
  search_btn: 'Search',
  search_empty: 'Enter a search term to find apps or countries.',
  search_no_results: 'No results found for',
  search_apps_label: 'Apps',
  search_countries_label: 'Countries',

  // AI page
  ai_title: 'AI Price Assistant',
  ai_subtitle: 'Ask anything about App Store prices worldwide',
  ai_placeholder: 'Ask about app prices...',
  ai_send: 'Send',
  ai_suggested: 'Suggested Questions',
  ai_initial: "Hi! I'm your App Price assistant.\n\nAsk me things like:\n- \"ChatGPT cheapest country?\"\n- \"Spotify rank in US\"\n- \"ChatGPT and Canva total price comparison\"",

  // App detail
  app_lowest_usd: 'Lowest (USD)',
  app_cheapest_region: 'Cheapest Region',
  app_highest_usd: 'Highest (USD)',
  app_max_savings: 'Max Savings',
  app_global_comparison: 'Global Price Comparison',
  app_regions: 'regions',
  app_no_data: 'No price data available.',
  app_disclaimer: 'Prices are for reference only. Exchange rates are approximate.',

  // Table headers
  table_rank: 'Rank',
  table_country: 'Country / Region',
  table_price: 'Price',
  table_usd: 'USD',
  table_cny: 'CNY',
  table_updated: 'Updated',
  table_app: 'App',
  table_category: 'Category',
  table_global_rank: 'Global Rank',
  table_lowest_badge: 'Lowest',
  table_best_badge: 'Best',

  // AppCard
  card_lowest_price: 'lowest price',
  card_free: 'Free',
  card_no_data: 'No data',

  // Data source indicator
  source_label: 'Data:',
  source_supabase: 'Supabase',
  source_mock: 'Mock',

  // Homepage section titles (hardcoded replacements)
  section_popular_title: 'Popular Apps',
  section_best_value_title: 'Best Value Apps',
  section_recent_title: 'Recently Updated',

  // Country detail
  country_apps_available: 'apps available',
  country_global_best: 'Global Best Prices',
  country_global_rank: 'Global Price Rank',
  country_categories: 'Categories',
  country_is_cheapest: 'This is the cheapest region overall for tracked apps.',
  country_search_apps: 'Search apps...',
  country_sort: 'Sort:',
  country_price_usd: 'Price (USD)',
  country_global_rank_sort: 'Global Rank',
  country_app_name: 'App Name',
  country_best_only: 'Best price only',
  country_no_match: 'No apps match your filters.',
  country_cheaper_msg: 'is the cheapest region (avg ${{avg}}). Prices here are ${{diff}} more on average — you could save {{pct}}% switching stores.',

  // Rankings
  ranking_country_title: 'Country Price Ranking',
  ranking_country_sub: 'Ranked by average App Store price (USD) across all tracked apps.',
  ranking_app_title: 'App Global Price Ranking',
  ranking_app_sub: 'Sorted by lowest global price (USD). Shows savings vs. most expensive region.',
  ranking_cheapest: 'Cheapest Overall',
  ranking_expensive: 'Most Expensive',
  ranking_regions: 'Tracked Countries',
  ranking_gap: 'gap',
  ranking_col_country: 'Country',
  ranking_col_avg: 'Avg Price',
  ranking_col_total: 'Total',
  ranking_col_best: 'Best Prices',
  ranking_col_apps: 'Apps',
  ranking_col_app: 'App',
  ranking_col_lowest: 'Lowest',
  ranking_col_highest: 'Highest',
  ranking_col_savings: 'Savings',
  ranking_col_regions: 'Regions',
  ranking_best: 'best',
  ranking_footer_app: 'Prices in USD. Savings = (highest − lowest) / highest × 100%.',
  ranking_footer_country: 'Average price calculated from available apps in each region.',
  ranking_regions_label: 'Regions',
  ranking_gap_label: '% gap',
  country_apps_count: '{{n}} apps available',
  app_data_updated: 'Data updated:',

  // Data Sources
  ds_title: 'Data Sources',
  ds_price_title: 'Price Data',
  ds_price_source: 'Apple iTunes Lookup API',
  ds_price_desc: 'We query the official Apple iTunes Search API for each app and country combination. This is a free, public API that returns current App Store prices.',
  ds_rates_title: 'Exchange Rates',
  ds_rates_source: 'Frankfurter API',
  ds_rates_desc: 'Exchange rates are sourced from the Frankfurter API, which aggregates data from the European Central Bank.',
  ds_freq_title: 'Update Frequency',
  ds_freq_desc: 'Prices and exchange rates are updated daily via automated jobs.',
  ds_coverage_title: 'Coverage',
  ds_faq_title: 'FAQ',
  ds_faq_1_q: 'Where does pricing data come from?',
  ds_faq_1_a: 'All prices are retrieved directly from Apple\'s iTunes Lookup API — the same data source used by the App Store itself.',
  ds_faq_2_q: 'How often is data updated?',
  ds_faq_2_a: 'Price data is refreshed daily. Exchange rates are also updated daily from the Frankfurter API.',
  ds_faq_3_q: 'Why are prices different between countries?',
  ds_faq_3_a: 'Apple sets regional prices independently, taking into account local currencies, purchasing power, taxes, and market conditions.',
  ds_faq_4_q: 'How are exchange rates calculated?',
  ds_faq_4_a: 'We use mid-market exchange rates from the European Central Bank via Frankfurter. Actual conversion rates may differ at point of purchase.',

  // About
  about_title: 'About App Price Radar',
  about_mission_title: 'Our Mission',
  about_mission: 'App Price Radar helps users around the world find the cheapest App Store subscription prices. We believe everyone should have access to transparent pricing information.',

  // Contact
  contact_title: 'Contact Us',
  contact_email_label: 'Email',
  contact_feedback_title: 'Send Feedback',
  contact_name: 'Your Name',
  contact_email_input: 'Your Email',
  contact_message: 'Your message...',
  contact_submit: 'Send Message',
  contact_sent: 'Message sent! Thank you.',

  // Footer
  footer_product: 'Product',
  footer_resources: 'Resources',
  footer_company: 'Company',
  footer_legal: 'Legal',
  footer_ai_search: 'AI Search',
  footer_data_sources: 'Data Sources',
  footer_faq: 'FAQ',
  footer_blog: 'Blog (coming soon)',
  footer_about: 'About Us',
  footer_contact: 'Contact',
  footer_privacy: 'Privacy Policy',
  footer_terms: 'Terms of Service',
  footer_disclaimer: 'Disclaimer',
  footer_copy: '© 2026 App Price Radar. All rights reserved.',

  // Legal
  privacy_title: 'Privacy Policy',
  terms_title: 'Terms of Service',
  disclaimer_title: 'Disclaimer',
  disclaimer_body: 'All prices displayed on App Price Radar are for reference only. Prices may vary due to regional taxes, currency fluctuations, and App Store policy changes. We are not affiliated with Apple Inc. We do not recommend switching App Store regions in violation of Apple\'s terms of service.',
};

export type LocaleKey = keyof typeof en;
