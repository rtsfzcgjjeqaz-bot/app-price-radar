// gen-plans.js — generates supabase/seeds/005_plans.sql
// Run: node scripts/gen-plans.js
const fs = require('fs');

// One-time paid apps (not subscriptions)
const ONE_TIME = new Set(['procreate','minecraft','monument-valley','alto-odyssey','bloons-td6']);
// Free apps
const FREE = new Set(['google-maps','waze','airbnb']);

// Subscription plan definitions: app_id -> array of plans
// Format: { id, name, billing_period, base_price_usd, is_default, description, features }
const SUBSCRIPTION_PLANS = {
  // ── AI / Productivity ──────────────────────────────────────────────────────
  'chatgpt': [
    { id:'chatgpt-free',   name:'ChatGPT Free',  billing:'free',    price:0,      default:false, desc:'Basic GPT-4o access with limits', features:['GPT-4o (limited)','Web browsing'] },
    { id:'chatgpt-plus',   name:'ChatGPT Plus',  billing:'monthly', price:20.00,  default:true,  desc:'Full GPT-4o, DALL-E, advanced features', features:['GPT-4o unlimited','DALL-E 3','Advanced data analysis','Custom GPTs'] },
  ],
  'claude-ai': [
    { id:'claude-ai-free', name:'Claude Free',   billing:'free',    price:0,      default:false, desc:'Limited Claude 3.5 Sonnet access', features:['Claude 3.5 Sonnet (limited)'] },
    { id:'claude-ai-pro',  name:'Claude Pro',    billing:'monthly', price:20.00,  default:true,  desc:'Priority access to all Claude models', features:['Claude 3.5 Sonnet unlimited','Claude 3 Opus','Priority access'] },
  ],
  'perplexity': [
    { id:'perplexity-free', name:'Perplexity Free', billing:'free',   price:0,     default:false, desc:'Basic AI search', features:['Standard search','5 Pro searches/day'] },
    { id:'perplexity-pro',  name:'Perplexity Pro',  billing:'monthly', price:20.00, default:true, desc:'Unlimited Pro searches with advanced AI', features:['Unlimited Pro searches','GPT-4o / Claude','Image upload'] },
  ],
  'copilot-ms': [
    { id:'copilot-ms-free', name:'Copilot Free',   billing:'free',    price:0,     default:false, desc:'Basic Copilot access', features:['GPT-4 Turbo (limited)'] },
    { id:'copilot-ms-pro',  name:'Copilot Pro',    billing:'monthly', price:20.00, default:true,  desc:'Priority access + Microsoft 365 integration', features:['Priority GPT-4 Turbo','Microsoft 365 AI','Image generation'] },
  ],
  'midjourney': [
    { id:'midjourney-basic', name:'Midjourney Basic', billing:'monthly', price:10.00, default:false, desc:'3.3 hrs fast GPU/month', features:['200 image generations','3.3 hrs fast GPU'] },
    { id:'midjourney-standard', name:'Midjourney Standard', billing:'monthly', price:30.00, default:true, desc:'15 hrs fast GPU + unlimited relax', features:['Unlimited relax mode','15 hrs fast GPU','General commercial use'] },
  ],
  // ── Music ─────────────────────────────────────────────────────────────────
  'spotify': [
    { id:'spotify-free',       name:'Spotify Free',       billing:'free',    price:0,     default:false, desc:'Ad-supported streaming', features:['Ad-supported','Shuffle only mobile'] },
    { id:'spotify-individual', name:'Spotify Premium',    billing:'monthly', price:11.99, default:true,  desc:'Ad-free streaming, offline, HQ', features:['Ad-free','Offline downloads','High quality audio'] },
    { id:'spotify-duo',        name:'Spotify Duo',        billing:'monthly', price:16.99, default:false, desc:'2 accounts sharing', features:['2 Premium accounts','Duo Mix playlist'] },
    { id:'spotify-family',     name:'Spotify Family',     billing:'monthly', price:19.99, default:false, desc:'Up to 6 accounts', features:['6 Premium accounts','Family Mix','Content filter'] },
  ],
  'tidal': [
    { id:'tidal-free',      name:'Tidal Free',      billing:'free',    price:0,     default:false, desc:'Ad-supported', features:['Ad-supported','Limited skips'] },
    { id:'tidal-individual',name:'Tidal HiFi',      billing:'monthly', price:11.00, default:true,  desc:'Lossless + Dolby Atmos', features:['Lossless HiFi','Dolby Atmos','Offline'] },
  ],
  'deezer': [
    { id:'deezer-free',       name:'Deezer Free',       billing:'free',    price:0,     default:false, desc:'Ad-supported', features:['Ad-supported'] },
    { id:'deezer-individual', name:'Deezer Premium',    billing:'monthly', price:11.99, default:true,  desc:'Ad-free, offline, HiFi', features:['Ad-free','Offline','HiFi option'] },
  ],
  'overcast': [
    { id:'overcast-free',    name:'Overcast Free',    billing:'free',    price:0,    default:false, desc:'Basic podcast app', features:['Smart Speed','Voice Boost'] },
    { id:'overcast-premium', name:'Overcast Premium', billing:'monthly', price:9.99, default:true,  desc:'Unlock all features + support development', features:['All features','Upload custom audio','No ads'] },
  ],
  'pocket-casts': [
    { id:'pocket-casts-free', name:'Pocket Casts Free', billing:'free',    price:0,    default:false, desc:'Core podcast features', features:['Variable speed','Trim silence'] },
    { id:'pocket-casts-plus', name:'Pocket Casts Plus', billing:'monthly', price:3.99, default:true,  desc:'Desktop app, extra themes, folders', features:['Desktop app','Watch app','Cloud storage','Themes'] },
  ],
  // ── Productivity ──────────────────────────────────────────────────────────
  'notion': [
    { id:'notion-free',     name:'Notion Free',     billing:'free',    price:0,     default:false, desc:'Personal use basics', features:['Unlimited pages','Basic sharing'] },
    { id:'notion-plus',     name:'Notion Plus',     billing:'monthly', price:12.00, default:true,  desc:'Unlimited guests, full version history', features:['Unlimited guests','Full history','Custom domains'] },
  ],
  'notability': [
    { id:'notability-free', name:'Notability Free', billing:'free',    price:0,     default:false, desc:'Basic notes', features:['Note taking','PDF annotation'] },
    { id:'notability-plus', name:'Notability+',     billing:'annual',  price:14.99, default:true,  desc:'All features including templates and cloud', features:['Auto-backup','Handwriting recognition','All templates'] },
  ],
  'microsoft-365': [
    { id:'microsoft-365-personal', name:'Microsoft 365 Personal', billing:'monthly', price:9.99,  default:true,  desc:'For 1 person — Word, Excel, PowerPoint + 1TB OneDrive', features:['Word / Excel / PowerPoint','1 TB OneDrive','1 person'] },
    { id:'microsoft-365-family',   name:'Microsoft 365 Family',   billing:'monthly', price:12.99, default:false, desc:'Up to 6 people', features:['Up to 6 people','6 TB OneDrive','Premium features'] },
  ],
  'grammarly': [
    { id:'grammarly-free',    name:'Grammarly Free',    billing:'free',    price:0,     default:false, desc:'Basic grammar and spelling', features:['Grammar check','Spelling','Punctuation'] },
    { id:'grammarly-premium', name:'Grammarly Premium', billing:'monthly', price:30.00, default:true,  desc:'Advanced suggestions + plagiarism detection', features:['Style improvements','Tone detection','Plagiarism checker'] },
  ],
  'todoist': [
    { id:'todoist-free', name:'Todoist Free', billing:'free',    price:0,    default:false, desc:'Core task management', features:['5 active projects','Collaborators'] },
    { id:'todoist-pro',  name:'Todoist Pro',  billing:'monthly', price:5.00, default:true,  desc:'Advanced reminders, labels, filters', features:['Unlimited projects','Reminders','Labels','Activity history'] },
  ],
  'bear': [
    { id:'bear-free', name:'Bear Free', billing:'free',    price:0,    default:false, desc:'Single device notes', features:['Core editor','Tags'] },
    { id:'bear-pro',  name:'Bear Pro',  billing:'monthly', price:3.99, default:true,  desc:'Sync, export, themes', features:['iCloud sync','PDF/Word export','Themes'] },
  ],
  'things3': [
    { id:'things3-standard', name:'Things 3', billing:'one_time', price:9.99, default:true, desc:'One-time purchase — iPhone app', features:['Full GTD','Projects','Areas','Magic Plus'] },
  ],
  'fantastical': [
    { id:'fantastical-free',   name:'Fantastical Free',   billing:'free',    price:0,    default:false, desc:'Basic calendar', features:['Calendar views','Natural language'] },
    { id:'fantastical-premium',name:'Fantastical Premium',billing:'monthly', price:6.75, default:true,  desc:'Full features incl. tasks and meet scheduling', features:['Tasks','Weather','Meet with Fantastical','Widgets'] },
  ],
  'ulysses': [
    { id:'ulysses-subscription', name:'Ulysses', billing:'monthly', price:6.99, default:true, desc:'Full Ulysses subscription', features:['Unlimited documents','iCloud sync','Publishing','Export themes'] },
  ],
  'drafts': [
    { id:'drafts-free', name:'Drafts Free', billing:'free',    price:0,    default:false, desc:'Core capture and editing', features:['Unlimited drafts','Basic actions'] },
    { id:'drafts-pro',  name:'Drafts Pro',  billing:'monthly', price:2.99, default:true,  desc:'Advanced actions, workspaces, themes', features:['Advanced actions','Workspaces','Scripting','Themes'] },
  ],
  'obsidian': [
    { id:'obsidian-free', name:'Obsidian Free', billing:'free',    price:0,    default:false, desc:'Local vault only', features:['Unlimited local notes','Plugins','Community themes'] },
    { id:'obsidian-sync', name:'Obsidian Sync', billing:'monthly', price:10.00, default:true, desc:'End-to-end encrypted sync', features:['E2E sync','1 year version history','Unlimited devices'] },
  ],
  'readwise-reader': [
    { id:'readwise-reader-free', name:'Reader Free',  billing:'free',    price:0,    default:false, desc:'Basic read-it-later', features:['Read later','Highlights'] },
    { id:'readwise-reader-full', name:'Reader Full',  billing:'monthly', price:7.99, default:true,  desc:'Full reader + Readwise sync', features:['Read later','Highlights','Readwise sync','AI summaries'] },
  ],
  'craft': [
    { id:'craft-free', name:'Craft Free', billing:'free',    price:0,    default:false, desc:'Core documents', features:['Unlimited docs','Basic sharing'] },
    { id:'craft-pro',  name:'Craft Pro',  billing:'monthly', price:5.99, default:true,  desc:'Advanced sharing, version history, AI', features:['Advanced sharing','AI writing','Version history'] },
  ],
  'dropbox': [
    { id:'dropbox-plus',       name:'Dropbox Plus',       billing:'monthly', price:11.99, default:true,  desc:'2 TB storage + 180-day history', features:['2 TB storage','180-day version history','Transfer up to 2 GB'] },
    { id:'dropbox-professional',name:'Dropbox Professional',billing:'monthly',price:19.99, default:false, desc:'3 TB + 180-day history', features:['3 TB storage','eSign','Smart Sync'] },
  ],
  'google-one': [
    { id:'google-one-basic',   name:'Google One Basic',   billing:'monthly', price:2.99,  default:true,  desc:'100 GB storage', features:['100 GB storage','Google expert support'] },
    { id:'google-one-standard',name:'Google One Standard',billing:'monthly', price:4.99,  default:false, desc:'200 GB storage', features:['200 GB storage','Family sharing'] },
    { id:'google-one-premium', name:'Google One Premium', billing:'monthly', price:12.99, default:false, desc:'2 TB storage', features:['2 TB storage','Google AI features','VPN'] },
  ],
  // ── Design & Creative ──────────────────────────────────────────────────────
  'canva': [
    { id:'canva-free',   name:'Canva Free',  billing:'free',    price:0,     default:false, desc:'Basic design tools', features:['250k+ templates','5 GB storage'] },
    { id:'canva-pro',    name:'Canva Pro',   billing:'monthly', price:14.99, default:true,  desc:'Brand Kit, background remover, 1 TB storage', features:['Brand Kit','Background remover','1 TB storage','Magic Resize'] },
  ],
  'pixelmator-pro': [
    { id:'pixelmator-pro-standard', name:'Pixelmator Pro', billing:'one_time', price:49.99, default:true, desc:'One-time purchase', features:['Full image editing','ML features','Metal GPU rendering'] },
  ],
  'linea-link': [
    { id:'linea-link-standard', name:'Linea Link', billing:'one_time', price:9.99, default:true, desc:'One-time purchase', features:['Infinite canvas','Apple Pencil','Export'] },
  ],
  'affinity-photo': [
    { id:'affinity-photo-standard', name:'Affinity Photo 2', billing:'one_time', price:19.99, default:true, desc:'One-time purchase', features:['RAW editing','Retouching','HDR merge'] },
  ],
  'affinity-designer': [
    { id:'affinity-designer-standard', name:'Affinity Designer 2', billing:'one_time', price:19.99, default:true, desc:'One-time purchase', features:['Vector + raster','Export persona','Symbol library'] },
  ],
  // ── Photo & Video ─────────────────────────────────────────────────────────
  'facetune': [
    { id:'facetune-free', name:'Facetune Free', billing:'free',    price:0,    default:false, desc:'Basic retouching', features:['Skin smoothing','Basic tools'] },
    { id:'facetune-pro',  name:'Facetune Pro',  billing:'monthly', price:7.99, default:true,  desc:'All AI tools unlocked', features:['Body reshape','Background','AI filters','Video editing'] },
  ],
  'adobe-lightroom': [
    { id:'adobe-lightroom-free', name:'Lightroom Free', billing:'free',    price:0,     default:false, desc:'Limited edits and storage', features:['7 GB cloud','Basic presets'] },
    { id:'adobe-lightroom-premium', name:'Lightroom Premium', billing:'monthly', price:9.99, default:true, desc:'Full AI editing + 1 TB cloud', features:['AI masking','1 TB cloud','Premium presets','Lens blur'] },
  ],
  'vsco': [
    { id:'vsco-free', name:'VSCO Free', billing:'free',    price:0,     default:false, desc:'Basic editing tools', features:['10 presets','Basic editing'] },
    { id:'vsco-pro',  name:'VSCO Membership', billing:'annual', price:29.99, default:true, desc:'All presets, video, montage', features:['200+ presets','Video editing','Montage','Print'] },
  ],
  'darkroom': [
    { id:'darkroom-free',  name:'Darkroom Free',  billing:'free',    price:0,    default:false, desc:'Core photo editing', features:['Non-destructive edits','Basic filters'] },
    { id:'darkroom-plus',  name:'Darkroom+',      billing:'monthly', price:9.99, default:true,  desc:'All filters, presets, video', features:['All filters','Presets','Video editing','Batch'] },
  ],
  'halide': [
    { id:'halide-standard', name:'Halide Mark II', billing:'annual', price:11.99, default:true, desc:'Full RAW camera subscription', features:['RAW capture','Neural RAW','Histogram','Focus peaking'] },
  ],
  'luma-ai': [
    { id:'luma-ai-free', name:'Luma Free', billing:'free',    price:0,    default:false, desc:'Limited 3D captures', features:['30 captures/month','Standard quality'] },
    { id:'luma-ai-pro',  name:'Luma Pro',  billing:'monthly', price:9.99, default:true,  desc:'Unlimited HD captures', features:['Unlimited captures','HD quality','Priority processing'] },
  ],
  'capcut': [
    { id:'capcut-free', name:'CapCut Free', billing:'free',    price:0,    default:false, desc:'Core video editor', features:['Basic editing','Transitions','Music'] },
    { id:'capcut-pro',  name:'CapCut Pro',  billing:'monthly', price:9.99, default:true,  desc:'AI features + watermark removal', features:['AI background','Remove watermark','Enhance AI','Text-to-video'] },
  ],
  // ── Entertainment ─────────────────────────────────────────────────────────
  'netflix': [
    { id:'netflix-standard',      name:'Netflix Standard',      billing:'monthly', price:15.49, default:true,  desc:'Full HD, 2 streams', features:['Full HD 1080p','2 screens','Downloads'] },
    { id:'netflix-standard-ads',  name:'Netflix Standard w/ Ads',billing:'monthly',price:7.99,  default:false, desc:'HD, ads, 2 streams', features:['HD 1080p','2 screens','Ads','Limited downloads'] },
    { id:'netflix-premium',       name:'Netflix Premium',       billing:'monthly', price:22.99, default:false, desc:'4K + HDR, 4 streams', features:['4K Ultra HD + HDR','4 screens','Spatial audio','4 downloads'] },
  ],
  'youtube-premium': [
    { id:'youtube-premium-individual', name:'YouTube Premium', billing:'monthly', price:13.99, default:true, desc:'Ad-free, offline, background play', features:['Ad-free','Background play','Offline downloads','YouTube Music'] },
    { id:'youtube-premium-family',     name:'YouTube Premium Family', billing:'monthly', price:22.99, default:false, desc:'Up to 5 family members', features:['Up to 5 members','All individual features'] },
  ],
  'disney-plus': [
    { id:'disney-plus-basic',   name:'Disney+ Basic',   billing:'monthly', price:7.99,  default:false, desc:'HD, ads', features:['Ad-supported','HD','2 concurrent streams'] },
    { id:'disney-plus-premium', name:'Disney+ Premium', billing:'monthly', price:13.99, default:true,  desc:'4K + no ads', features:['4K UHD','No ads','Dolby Atmos','4 streams'] },
  ],
  'hbo-max': [
    { id:'hbo-max-with-ads', name:'Max (With Ads)',  billing:'monthly', price:9.99,  default:false, desc:'HD, limited ads', features:['HD','1080p','2 streams','Ads'] },
    { id:'hbo-max-ad-free',  name:'Max (Ad-Free)',   billing:'monthly', price:15.99, default:true,  desc:'Full HD ad-free', features:['Ad-free','1080p','2 streams','30 downloads'] },
    { id:'hbo-max-ultimate', name:'Max Ultimate',    billing:'monthly', price:19.99, default:false, desc:'4K UHD, Dolby Atmos', features:['4K UHD','Dolby Atmos','4 streams','100 downloads'] },
  ],
  'amazon-prime': [
    { id:'amazon-prime-monthly', name:'Amazon Prime',  billing:'monthly', price:14.99, default:true,  desc:'Prime Video + shopping + music', features:['Prime Video','Prime Music','Free shipping','Prime Reading'] },
  ],
  'apple-tv': [
    { id:'apple-tv-individual', name:'Apple TV+',        billing:'monthly', price:9.99, default:true, desc:'Apple Original series and films', features:['4K HDR','Dolby Atmos','6 family members'] },
  ],
  'apple-arcade': [
    { id:'apple-arcade-individual', name:'Apple Arcade', billing:'monthly', price:6.99, default:true, desc:'200+ premium games, no ads', features:['200+ games','No ads or IAP','Family Sharing'] },
  ],
  // ── Health & Fitness ──────────────────────────────────────────────────────
  'headspace': [
    { id:'headspace-free', name:'Headspace Free', billing:'free',    price:0,     default:false, desc:'Limited meditations', features:['Basics course','3 meditations'] },
    { id:'headspace-plus', name:'Headspace+',     billing:'monthly', price:12.99, default:true,  desc:'Full library of meditations and sleep content', features:['500+ meditations','Sleep content','Focus music','Live events'] },
  ],
  'calm': [
    { id:'calm-free',    name:'Calm Free',    billing:'free',    price:0,     default:false, desc:'Limited content', features:['7 Days of Calm','Limited sleep stories'] },
    { id:'calm-premium', name:'Calm Premium', billing:'annual',  price:69.99, default:true,  desc:'Full access to all content', features:['200+ Sleep Stories','Daily Calm','Music','Masterclasses'] },
  ],
  'strava': [
    { id:'strava-free',      name:'Strava Free',      billing:'free',    price:0,     default:false, desc:'Basic activity tracking', features:['GPS tracking','Activity feed','Routes'] },
    { id:'strava-subscribe', name:'Strava Subscriber', billing:'monthly', price:11.99, default:true,  desc:'Advanced analytics + training plans', features:['Segments','Training plans','Heart rate analysis','Live Segments'] },
  ],
  'noom': [
    { id:'noom-standard', name:'Noom', billing:'monthly', price:59.99, default:true, desc:'Psychology-based weight loss program', features:['Calorie tracking','Coaching','Curriculum','Health goals'] },
  ],
  'peloton': [
    { id:'peloton-app-one',      name:'Peloton App One',      billing:'monthly', price:12.99, default:false, desc:'3 classes/month', features:['3 classes/month','All class types'] },
    { id:'peloton-app-plus',     name:'Peloton App+',         billing:'monthly', price:24.00, default:true,  desc:'Unlimited classes', features:['Unlimited classes','All modalities','Leaderboard'] },
  ],
  'whoop': [
    { id:'whoop-membership', name:'WHOOP Membership', billing:'monthly', price:30.00, default:true, desc:'Health and fitness tracker subscription (hardware included)', features:['Continuous monitoring','Recovery score','Sleep coaching','Hardware included'] },
  ],
  'mymacros': [
    { id:'mymacros-free',    name:'MyFitnessPal Free',    billing:'free',    price:0,    default:false, desc:'Basic calorie counting', features:['Calorie tracking','Basic food database','Exercise logging'] },
    { id:'mymacros-premium', name:'MyFitnessPal Premium', billing:'monthly', price:9.99, default:true,  desc:'Advanced macros, meal planning, full analysis', features:['Macro tracking','Meal planning','API access','Advanced analysis'] },
  ],
  'lifesum': [
    { id:'lifesum-free',    name:'Lifesum Free',    billing:'free',    price:0,    default:false, desc:'Basic food diary', features:['Food diary','Water tracking'] },
    { id:'lifesum-premium', name:'Lifesum Premium', billing:'monthly', price:5.99, default:true,  desc:'Meal plans, advanced goals, insights', features:['Meal plans','Personalized diet','Advanced insights','Recipes'] },
  ],
  // ── Education ─────────────────────────────────────────────────────────────
  'duolingo': [
    { id:'duolingo-free',   name:'Duolingo Free',   billing:'free',    price:0,    default:false, desc:'Core language learning with ads', features:['All languages','Basic path','Hearts system'] },
    { id:'duolingo-super',  name:'Duolingo Super',  billing:'monthly', price:8.99, default:true,  desc:'Unlimited hearts, offline, no ads', features:['Unlimited hearts','Offline','No ads','Streak repair'] },
  ],
  'babbel': [
    { id:'babbel-monthly', name:'Babbel Monthly', billing:'monthly', price:14.95, default:false, desc:'1 language, monthly', features:['1 language','All lessons','Offline'] },
    { id:'babbel-annual',  name:'Babbel Annual',  billing:'annual',  price:83.40, default:true,  desc:'All languages for 1 year', features:['All languages','Speech recognition','Live classes'] },
  ],
  'masterclass': [
    { id:'masterclass-individual', name:'MasterClass Individual', billing:'annual', price:120.00, default:false, desc:'1 device, 1 account', features:['All instructors','Offline downloads','1 account'] },
    { id:'masterclass-duo',        name:'MasterClass Duo',        billing:'annual', price:150.00, default:true,  desc:'2 accounts, all classes', features:['2 accounts','All instructors','Offline'] },
  ],
  'skillshare': [
    { id:'skillshare-membership', name:'Skillshare Membership', billing:'monthly', price:16.99, default:true, desc:'Unlimited access to all classes', features:['Unlimited classes','Offline viewing','Projects','Community'] },
  ],
  'coursera': [
    { id:'coursera-plus', name:'Coursera Plus', billing:'monthly', price:59.00, default:true, desc:'Unlimited access to 7,000+ courses', features:['7,000+ courses','Certificates','Specializations','Professional certificates'] },
  ],
  // ── Finance ───────────────────────────────────────────────────────────────
  'robinhood': [
    { id:'robinhood-free',  name:'Robinhood Free',  billing:'free',    price:0,    default:false, desc:'Basic investing', features:['Commission-free trading','Stocks & ETFs','Crypto'] },
    { id:'robinhood-gold',  name:'Robinhood Gold',  billing:'monthly', price:5.00, default:true,  desc:'Margin investing + research', features:['Margin investing','Morningstar research','3% IRA match','5% interest'] },
  ],
  'coinbase': [
    { id:'coinbase-free',     name:'Coinbase Free',     billing:'free',    price:0,     default:false, desc:'Basic crypto trading', features:['Buy/sell crypto','Coinbase Wallet'] },
    { id:'coinbase-advanced', name:'Coinbase Advanced',  billing:'monthly', price:29.99, default:true,  desc:'Advanced trading + lower fees', features:['Advanced charts','Volume discounts','Priority support'] },
  ],
  'ynab': [
    { id:'ynab-annual', name:'YNAB', billing:'annual', price:109.00, default:true, desc:'Zero-based budgeting app', features:['Goal tracking','Bank sync','Reports','Debt management'] },
  ],
  'personal-capital': [
    { id:'personal-capital-free', name:'Empower Free', billing:'free', price:0, default:true, desc:'Free financial dashboard', features:['Net worth','Investment tracking','Budgeting','Fee analyzer'] },
  ],
  // ── Social ────────────────────────────────────────────────────────────────
  'ivory': [
    { id:'ivory-tip-jar', name:'Ivory (Tip Jar)', billing:'monthly', price:1.99, default:true, desc:'Optional tip jar subscription for Mastodon client', features:['Full app features','Support development','Exclusive icons'] },
  ],
  'discord': [
    { id:'discord-free',  name:'Discord Free',  billing:'free',    price:0,    default:false, desc:'Core messaging and voice', features:['Voice/video','Servers','Basic emojis'] },
    { id:'discord-nitro', name:'Discord Nitro', billing:'monthly', price:9.99, default:true,  desc:'Custom emojis, server boosts, HD video', features:['Custom emojis','2 server boosts','HD video','100 MB uploads','Animated avatar'] },
  ],
  'telegram-premium': [
    { id:'telegram-premium-sub', name:'Telegram Premium', billing:'monthly', price:4.99, default:true, desc:'No limits, exclusive features', features:['No limits on media','Voice-to-text','4GB file uploads','Premium stickers','Faster downloads'] },
  ],
  // ── Utilities / VPN ───────────────────────────────────────────────────────
  '1password': [
    { id:'1password-individual', name:'1Password Individual', billing:'monthly', price:3.99, default:true, desc:'Secure password manager for 1 person', features:['Unlimited passwords','1 GB document storage','24/7 support','Watchtower'] },
    { id:'1password-families',   name:'1Password Families',   billing:'monthly', price:6.95, default:false, desc:'Up to 5 family members', features:['5 members','Family vault sharing','Guest accounts'] },
  ],
  'nordvpn': [
    { id:'nordvpn-standard', name:'NordVPN Standard',  billing:'monthly', price:12.99, default:true,  desc:'VPN + malware protection', features:['VPN','Threat Protection','6 devices'] },
    { id:'nordvpn-plus',     name:'NordVPN Plus',      billing:'monthly', price:14.99, default:false, desc:'VPN + password manager + data breach scanner', features:['VPN','Password Manager','Data Breach Scanner'] },
  ],
  'expressvpn': [
    { id:'expressvpn-standard', name:'ExpressVPN', billing:'monthly', price:12.95, default:true, desc:'Fast, secure VPN', features:['VPN','8 devices','24/7 support','Network Lock'] },
  ],
  // ── Travel ────────────────────────────────────────────────────────────────
  'tripit': [
    { id:'tripit-free', name:'TripIt Free',  billing:'free',    price:0,    default:false, desc:'Basic itinerary organiser', features:['Master itinerary','Travel maps'] },
    { id:'tripit-pro',  name:'TripIt Pro',   billing:'annual',  price:49.99,default:true,  desc:'Real-time alerts, seat tracking, loyalty management', features:['Real-time alerts','Seat tracking','Points tracker','Flight refund'] },
  ],
  // ── Developer Tools ───────────────────────────────────────────────────────
  'proxyman': [
    { id:'proxyman-standard', name:'Proxyman', billing:'one_time', price:49.99, default:true, desc:'One-time purchase (or subscription for updates)', features:['HTTP/HTTPS debug','SSL pinning bypass','Scripting','Map local'] },
  ],
  'working-copy': [
    { id:'working-copy-standard', name:'Working Copy', billing:'one_time', price:19.99, default:true, desc:'One-time unlock', features:['Full Git client','Push/pull','SSH','Merge'] },
  ],
  'textsoap': [
    { id:'textsoap-standard', name:'Toolbox for Word', billing:'one_time', price:9.99, default:true, desc:'One-time purchase', features:['Word templates','Tools'] },
  ],
  // ── Games ─────────────────────────────────────────────────────────────────
  'roblox': [
    { id:'roblox-premium-450',  name:'Roblox Premium 450',  billing:'monthly', price:4.99,  default:false, desc:'450 Robux/month + 10% bonus', features:['450 Robux/month','10% bonus Robux','Trading'] },
    { id:'roblox-premium-1000', name:'Roblox Premium 1000', billing:'monthly', price:9.99,  default:true,  desc:'1,000 Robux/month', features:['1,000 Robux/month','10% bonus','Trading'] },
    { id:'roblox-premium-2200', name:'Roblox Premium 2200', billing:'monthly', price:19.99, default:false, desc:'2,200 Robux/month', features:['2,200 Robux/month','10% bonus','Trading'] },
  ],
  // ── Books & Reading ───────────────────────────────────────────────────────
  'kindle': [
    { id:'kindle-unlimited', name:'Kindle Unlimited', billing:'monthly', price:11.99, default:true, desc:'Unlimited access to over 4 million titles', features:['4M+ titles','Audiobooks','Magazines','Borrow 10 at a time'] },
  ],
  'audible': [
    { id:'audible-plus',    name:'Audible Plus',    billing:'monthly', price:7.95,  default:false, desc:'Unlimited Plus Catalogue listening', features:['Plus Catalogue','Unlimited listening'] },
    { id:'audible-premium', name:'Audible Premium', billing:'monthly', price:14.95, default:true,  desc:'1 credit/month + Plus Catalogue', features:['1 credit/month','Plus Catalogue','30% off extras'] },
  ],
  'scribd': [
    { id:'scribd-standard', name:'Scribd', billing:'monthly', price:11.99, default:true, desc:'Unlimited books, audiobooks, magazines, documents', features:['Books','Audiobooks','Sheet music','Magazines','Documents'] },
  ],
  // ── Business ──────────────────────────────────────────────────────────────
  'shopify': [
    { id:'shopify-basic',    name:'Shopify Basic',    billing:'monthly', price:29.00,  default:false, desc:'For solo entrepreneurs', features:['Online store','2 staff accounts','4 locations'] },
    { id:'shopify-standard', name:'Shopify',          billing:'monthly', price:79.00,  default:true,  desc:'For growing businesses', features:['5 staff accounts','5 locations','Lower transaction fees'] },
    { id:'shopify-advanced', name:'Shopify Advanced', billing:'monthly', price:299.00, default:false, desc:'For scaling', features:['15 staff accounts','Advanced analytics','Custom reports'] },
  ],
  // ── Misc ─────────────────────────────────────────────────────────────────
  'day-one': [
    { id:'day-one-free',   name:'Day One Free',   billing:'free',    price:0,    default:false, desc:'Single journal', features:['1 journal','Basic entries'] },
    { id:'day-one-premium',name:'Day One Premium',billing:'monthly', price:4.99, default:true,  desc:'Unlimited journals, templates, end-to-end encryption', features:['Unlimited journals','E2E encryption','Templates','IFTTT integration'] },
  ],
};

// Build SQL rows
const esc = (s) => s.replace(/'/g, "''");
const planRows = [];

for (const [appId, plans] of Object.entries(SUBSCRIPTION_PLANS)) {
  for (const p of plans) {
    const features = '{' + p.features.map(f => `"${esc(f)}"`).join(',') + '}';
    planRows.push(`('${p.id}','${appId}','${esc(p.name)}','${p.billing}',${p.price},${p.default},'${esc(p.desc)}','${features}')`);
  }
}

// One-time paid apps
for (const appId of ONE_TIME) {
  const BASE = { procreate:12.99, minecraft:6.99, 'monument-valley':3.99, 'alto-odyssey':4.99, 'bloons-td6':4.99 };
  const name = { procreate:'Procreate', minecraft:'Minecraft', 'monument-valley':'Monument Valley', 'alto-odyssey':"Alto's Odyssey", 'bloons-td6':'Bloons TD 6' };
  planRows.push(`('${appId}-standard','${appId}','${esc(name[appId])}','one_time',${BASE[appId]},true,'One-time purchase','{"Full game"}')`);
}

// Free apps
for (const appId of FREE) {
  const name = { 'google-maps':'Google Maps','waze':'Waze','airbnb':'Airbnb' };
  planRows.push(`('${appId}-free','${appId}','${esc(name[appId])} Free','free',0,true,'Free app','{"Core features"}')`);
}

let sql = '-- plans seed\n-- Primary subscription plans for all 85 tracked apps.\n-- Idempotent: safe to re-run.\n\n';
sql += 'insert into plans (id, app_id, name, billing_period, base_price_usd, is_default, description, features) values\n';
sql += planRows.join(',\n') + '\n';
sql += 'on conflict (id) do update set\n';
sql += '  name=excluded.name, billing_period=excluded.billing_period,\n';
sql += '  base_price_usd=excluded.base_price_usd, is_default=excluded.is_default,\n';
sql += '  description=excluded.description, features=excluded.features,\n';
sql += '  updated_at=now();\n\n';

// Backfill current_prices.plan_id for default plans
sql += '-- Backfill current_prices: set plan_id = default plan for each app\n';
sql += 'update current_prices cp\n';
sql += 'set plan_id = p.id\n';
sql += 'from plans p\n';
sql += 'where p.app_id = cp.app_id\n';
sql += '  and p.is_default = true\n';
sql += '  and cp.plan_id is null;\n';

fs.writeFileSync('supabase/seeds/005_plans.sql', sql);

console.log(`Plans: ${planRows.length}`);
console.log('Apps covered:', Object.keys(SUBSCRIPTION_PLANS).length + ONE_TIME.size + FREE.size);
console.log('Seed written to supabase/seeds/005_plans.sql');
