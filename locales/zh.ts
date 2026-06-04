import type { LocaleKey } from './en';

export const zh: Record<LocaleKey, string> = {
  // Nav
  nav_search: '搜索',
  nav_ai: 'AI',
  nav_app_ranking: 'App 排行',
  nav_country_ranking: '国家排行',
  nav_data_sources: '数据来源',
  nav_lang_en: 'EN',
  nav_lang_zh: '中文',

  // Hero
  hero_badge: '每日更新全球 App Store 价格',
  hero_headline: '全球 App Store 价格比较',
  hero_subheadline: '找到 ChatGPT、Spotify、Canva、Netflix 等 App 最便宜的购买地区。',
  hero_search_placeholder: '搜索 App、国家，或向 AI 提问...',
  hero_browse_us: '浏览美区商店',
  popular_searches: '热门：',

  // Stats
  stat_apps: '追踪 App',
  stat_countries: '覆盖国家',
  stat_prices: '价格数据点',
  stat_currencies: '货币种类',

  // Sections
  section_popular: '🔥 热门 App',
  section_best_value: '💸 最超值 App',
  section_best_value_sub: '按全球最低价排序',
  section_recent: '🕒 最近更新',
  section_view_all: '查看全部',

  // Why Use
  why_title: '为什么选择 App Price Radar',
  why_1_title: '全球价格对比',
  why_1_desc: '一站式比较 20+ 个国家的 App Store 价格，省去逐一搜索的麻烦。',
  why_2_title: 'AI 智能洞察',
  why_2_desc: '用自然语言提问，即时获取价格分析和推荐。',
  why_3_title: '每日价格更新',
  why_3_desc: '通过 Apple 官方 iTunes Lookup API 每日自动更新价格数据。',

  // Search page
  search_title: '搜索',
  search_placeholder: '搜索 App 或国家...',
  search_btn: '搜索',
  search_empty: '输入关键词搜索 App 或国家。',
  search_no_results: '未找到相关结果：',
  search_apps_label: 'App',
  search_countries_label: '国家',

  // AI page
  ai_title: 'AI 价格助手',
  ai_subtitle: '随时提问，了解全球 App Store 价格',
  ai_placeholder: '提问关于 App 价格...',
  ai_send: '发送',
  ai_suggested: '热门问题',
  ai_initial: '你好！我是 App Price 价格助手。\n\n你可以问我：\n- "ChatGPT 在哪个国家最便宜？"\n- "Spotify 在美国排名第几？"\n- "ChatGPT 和 Canva 哪个国家总价最低？"',

  // App detail
  app_lowest_usd: '最低价 (USD)',
  app_cheapest_region: '最便宜地区',
  app_highest_usd: '最高价 (USD)',
  app_max_savings: '最多节省',
  app_global_comparison: '全球价格对比',
  app_regions: '个地区',
  app_no_data: '暂无价格数据。',
  app_disclaimer: '价格仅供参考，汇率为近似值。',

  // Country detail
  country_apps_available: '个 App 可用',
  country_global_best: '全球最低价',
  country_global_rank: '全球价格排名',
  country_categories: '分类',
  country_is_cheapest: '该地区是所有追踪 App 中综合价格最低的地区。',
  country_search_apps: '搜索 App...',
  country_sort: '排序：',
  country_price_usd: '价格 (USD)',
  country_global_rank_sort: '全球排名',
  country_app_name: 'App 名称',
  country_best_only: '仅显示最低价',
  country_no_match: '没有符合筛选条件的 App。',
  country_cheaper_msg: '是综合价格最低的地区（均价 ${{avg}}）。该地区价格平均高出 ${{diff}}，切换商店可节省约 {{pct}}%。',

  // Rankings
  ranking_country_title: '国家价格排行',
  ranking_country_sub: '按所有追踪 App 的平均 USD 价格排名。',
  ranking_app_title: 'App 全球价格排行',
  ranking_app_sub: '按全球最低价（USD）排序，显示与最贵地区的节省幅度。',
  ranking_cheapest: '综合最便宜',
  ranking_expensive: '综合最贵',
  ranking_regions: '覆盖国家',
  ranking_gap: '价差',
  ranking_col_country: '国家',
  ranking_col_avg: '均价',
  ranking_col_total: '合计',
  ranking_col_best: '最低价数量',
  ranking_col_apps: 'App 数',
  ranking_col_app: 'App',
  ranking_col_lowest: '最低价',
  ranking_col_highest: '最高价',
  ranking_col_savings: '节省',
  ranking_col_regions: '地区数',
  ranking_best: '最低价',

  // Data Sources
  ds_title: '数据来源',
  ds_price_title: '价格数据',
  ds_price_source: 'Apple iTunes Lookup API',
  ds_price_desc: '我们通过 Apple 官方 iTunes Search API 查询每个 App 在各国的当前价格，该接口是免费的公开 API。',
  ds_rates_title: '汇率数据',
  ds_rates_source: 'Frankfurter API',
  ds_rates_desc: '汇率来自 Frankfurter API，数据源为欧洲中央银行。',
  ds_freq_title: '更新频率',
  ds_freq_desc: '价格和汇率通过自动任务每日更新。',
  ds_coverage_title: '覆盖范围',
  ds_faq_title: '常见问题',
  ds_faq_1_q: '价格数据来自哪里？',
  ds_faq_1_a: '所有价格均直接从 Apple iTunes Lookup API 获取，与 App Store 使用相同的数据源。',
  ds_faq_2_q: '数据多久更新一次？',
  ds_faq_2_a: '价格数据每日刷新，汇率同样来自 Frankfurter API 每日更新。',
  ds_faq_3_q: '为什么不同国家价格不同？',
  ds_faq_3_a: 'Apple 根据当地货币、购买力、税收和市场情况独立设定各地区价格。',
  ds_faq_4_q: '汇率如何计算？',
  ds_faq_4_a: '我们使用欧洲中央银行通过 Frankfurter 提供的中间汇率，实际购买时的汇率可能有所不同。',

  // About
  about_title: '关于 App Price Radar',
  about_mission_title: '我们的使命',
  about_mission: 'App Price Radar 帮助全球用户找到 App Store 订阅的最低价。我们相信，每个人都有权获取透明的价格信息。',

  // Contact
  contact_title: '联系我们',
  contact_email_label: '邮件',
  contact_feedback_title: '发送反馈',
  contact_name: '您的姓名',
  contact_email_input: '您的邮箱',
  contact_message: '您的留言...',
  contact_submit: '发送',
  contact_sent: '消息已发送，感谢您的反馈！',

  // Footer
  footer_product: '产品',
  footer_resources: '资源',
  footer_company: '公司',
  footer_legal: '法律',
  footer_ai_search: 'AI 搜索',
  footer_data_sources: '数据来源',
  footer_faq: '常见问题',
  footer_blog: '博客（即将上线）',
  footer_about: '关于我们',
  footer_contact: '联系我们',
  footer_privacy: '隐私政策',
  footer_terms: '服务条款',
  footer_disclaimer: '免责声明',
  footer_copy: '© 2026 App Price Radar. 保留所有权利。',

  // Legal
  privacy_title: '隐私政策',
  terms_title: '服务条款',
  disclaimer_title: '免责声明',
  disclaimer_body: 'App Price Radar 所展示的所有价格仅供参考。价格可能因地区税收、汇率波动和 App Store 政策变化而有所不同。本站与 Apple Inc. 无任何关联。我们不建议用户违反 Apple 服务条款切换 App Store 地区。',
};
