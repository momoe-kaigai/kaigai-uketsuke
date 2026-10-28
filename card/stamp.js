// Kaigai Party スタンプカード
// 名簿（12/4 kaigai 名簿）のウェブアプリの URL（…/exec）。受付ページ kaigai-uketsuke と同じもの。
// 空のあいだは見本の表示になる。
const STAMP_API_URL = 'https://script.google.com/macros/s/AKfycbwohpwAkRQQFriFJt9Bgg1zQ669x13PcxHLVfsDrCCzEx-s74t7H2qkMXfD9X6WawOI/exec';

const STAMP_DEMO = !STAMP_API_URL;

// 返事の形：{ ok, name, stamps, goal, parties:[{name,date}], gifts, giftDue, next:{name,date,qr}|null }
// 見つからないとき：{ ng: "…" }
async function fetchCard(cardId) {
  // Apps Script は c という名前の値を受け取らない（Googleが使う名前）ので cid で送る
  const url = STAMP_API_URL + '?api=card&cid=' + encodeURIComponent(cardId);
  // Google のログイン情報を送らない（受付ページと同じ）
  const res = await fetch(url, { credentials: 'omit' });
  return res.json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// いまのカードに並ぶパーティー（グッズを渡した分は前のカード）
function currentCard(state) {
  const goal = state.goal || 5;
  const start = (state.gifts || 0) * goal;
  const parties = (state.parties || []).slice(start, start + goal);
  return { goal: goal, parties: parties, filled: Math.min(goal, state.stamps - start) };
}

// 台帳の名前だけではテーマがわからない回
const LABELS = [
  { test: /2026\/9\/3/, label: 'Private High School' },
];

// "2025/9/6 cowboy" → "cowboy"（日付は横に小さく出す）
function partyLabel(p) {
  const fixed = LABELS.find(l => l.test.test(p.name));
  if (fixed) return fixed.label;
  return String(p.name).replace(/^\d{4}\/\d{1,2}\/\d{1,2}\s*/, '').replace(/^\d{1,2}\/\d{1,2}\s*/, '');
}

// ---- チャームブレスレット（Pandora風） ----
// パーティー名からチャームの絵と色を決める
const CHARMS = [
  { test: /love/i,                         icon: 'heart',     color: '#e0457b' },
  { test: /garden/i,                       icon: 'flower',    color: '#5f8f5a' },
  { test: /cowboy/i,                       icon: 'hat',       color: '#9a6a3a' },
  { test: /white/i,                        icon: 'snow',      color: '#8fb3d9' },
  { test: /black|mask|仮面|東京/i,           icon: 'mask',      color: '#2b211a' },
  { test: /school|9\/3|パーティー/i,         icon: 'ribbon',    color: '#2d4a7a' },
];
const DEFAULT_CHARM = { icon: 'star', color: '#ad8a4d' };

function charmFor(p) {
  return CHARMS.find(c => c.test.test(p.name)) || DEFAULT_CHARM;
}

// 24x24 の中に描くチャームの形。f は塗りの色
const SHAPES = {
  heart: f => `<path d="M12 20s-7-4.4-8.6-8.4A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.6 4.4C19 15.6 12 20 12 20z" fill="${f}"/>`,
  flower: f => `<g fill="${f}"><circle cx="12" cy="6.5" r="3.4"/><circle cx="17.2" cy="10.3" r="3.4"/><circle cx="15.2" cy="16.4" r="3.4"/><circle cx="8.8" cy="16.4" r="3.4"/><circle cx="6.8" cy="10.3" r="3.4"/><circle cx="12" cy="12" r="3.5"/></g>`,
  hat: f => `<path d="M2.5 15.5c3.5 2.6 15.5 2.6 19 0-1.8.2-3-.6-3.6-2.2L16.8 8c-.6-1.4-2.6-.6-4.8-.6S7.8 6.6 7.2 8l-1.1 5.3c-.6 1.6-1.8 2.4-3.6 2.2z" fill="${f}"/>`,
  snow: f => `<g stroke="${f}" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2M5 11.2l2.3 .8-.3 2.6M19 12.8l-2.3-.8.3-2.6"/></g>`,
  mask: f => `<path d="M2.5 9.5c3-2.2 6.5-2.2 9.5 0 3-2.2 6.5-2.2 9.5 0 0 5-2.6 7-5.6 7-2 0-3-2-3.9-2s-1.9 2-3.9 2c-3 0-5.6-2-5.6-7z" fill="${f}"/>`,
  ribbon: f => `<path d="M12 11 3.5 6v10zM12 11l8.5-5v10z" fill="${f}"/><circle cx="12" cy="11" r="2.6" fill="${f}"/><path d="M11 12.5 8.5 20.5M13 12.5l2.5 8" stroke="${f}" stroke-width="2.2" stroke-linecap="round"/>`,
  star: f => `<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z" fill="${f}"/>`,
};
// 形の上に重ねる細かいところ（マスクの目・花の芯）
const DETAILS = {
  mask: '<ellipse cx="7.6" cy="11.2" rx="2" ry="1.3" fill="#000" opacity=".75"/><ellipse cx="16.4" cy="11.2" rx="2" ry="1.3" fill="#000" opacity=".75"/>',
  flower: '<circle cx="12" cy="12" r="2.2" fill="#f6d36b"/>',
};
// 形のいちばん上（24x24の中の y）。チャームを輪にぴったりつるすため
const SHAPE_TOP = { heart: 7, flower: 3, hat: 7.4, snow: 3, mask: 7.5, ribbon: 6, star: 3.5 };

// ローズゴールドの枠にエナメルの色。(0,0) がつるす輪
function dangleCharm(ch) {
  const dy = 10 - 2.4 * SHAPE_TOP[ch.icon];
  const big = 'translate(-28.8 ' + dy + ') scale(2.4)';
  const inner = 'translate(-22.8 ' + (dy + 6) + ') scale(1.9)';
  return `<circle r="4.5" fill="none" stroke="url(#rose)" stroke-width="2.2"/>
    <line y1="4" y2="11" stroke="url(#rose)" stroke-width="2"/>
    <g transform="translate(.9 .9)" opacity=".25"><g transform="${big}">${SHAPES[ch.icon]('#000')}</g></g>
    <g transform="${big}">${SHAPES[ch.icon]('url(#rose)')}</g>
    <g transform="${inner}">${SHAPES[ch.icon](ch.color)}</g>
    <g transform="${big}">${DETAILS[ch.icon] || ''}</g>
    <ellipse cx="-10" cy="${dy + 16}" rx="6" ry="2.5" fill="#fff" opacity=".45" transform="rotate(-35 -10 ${dy + 16})"/>`;
}

// ブレスレットを描く。丸い輪の下半分に、来た回のチャームを5つつるす
function renderBracelet(el, state) {
  const c = currentCard(state);
  const W = 320, H = 300, cx = 160, cy = 128, rx = 118, ry = 104;
  const at = deg => {
    const a = deg * Math.PI / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), a: a };
  };
  // くさりの輪（ひとまわり）
  let chain = '';
  for (let deg = 0; deg < 360; deg += 3.2) {
    const p = at(deg);
    // 輪の向きにそって少しかたむける
    const rot = deg + 90;
    chain += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="3.6" ry="2.2" fill="none" stroke="url(#rose)" stroke-width="1.4" transform="rotate(${rot.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
  }
  // 留め金（いちばん上）
  const top = at(270);
  const clasp = `<g transform="translate(${top.x.toFixed(1)} ${top.y.toFixed(1)})">
    <rect x="-16" y="-7" width="32" height="14" rx="7" fill="url(#rose)" stroke="#8a5547" stroke-width=".6"/>
    <text y="4" text-anchor="middle" font-family="'Great Vibes',cursive" font-size="11" fill="#4d1b1e">K</text>
  </g>`;
  // 下半分に左から右へ5つ。5つ目がごほうび（中身はお客さんには内緒）
  const angles = [162, 126, 90, 54, 18].slice(0, c.goal);
  let charms = '';
  angles.forEach((deg, i) => {
    const p = at(deg);
    const item = c.parties[i];
    const isGift = i === c.goal - 1;
    let body;
    if (i < c.filled && item) {
      body = dangleCharm(isGift && state.giftDue ? { icon: 'heart', color: '#e0457b' } : charmFor(item));
    } else if (isGift) {
      body = `<line y1="0" y2="8" stroke="#e0457b" stroke-width="1.4" stroke-dasharray="2 2"/>
        <path d="M0 52s-20-12-20-25a11 11 0 0 1 20-6 11 11 0 0 1 20 6C20 40 0 52 0 52z" fill="#fff0f5" stroke="#e0457b" stroke-width="1.5" stroke-dasharray="4 3"/>
        <text y="36" text-anchor="middle" font-size="15" font-weight="700" fill="#e0457b">?</text>`;
    } else {
      body = `<line y1="0" y2="10" stroke="#c9a59a" stroke-width="1.2" stroke-dasharray="2 2"/>
        <circle cy="30" r="19" fill="#fff" fill-opacity=".6" stroke="#c9a59a" stroke-width="1.3" stroke-dasharray="4 3"/>
        <text y="34" text-anchor="middle" font-size="12" fill="#b58f84">${i + 1}</text>`;
    }
    charms += `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">${body}</g>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="チャームブレスレット ${c.filled} / ${c.goal}">
    <defs>
      <linearGradient id="rose" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fde8df"/><stop offset=".5" stop-color="#d99a86"/><stop offset="1" stop-color="#8a5547"/>
      </linearGradient>
    </defs>
    ${chain}
    ${clasp}
    ${charms}
  </svg>`;
}

// チャームの一覧（ブレスレットの下）
function renderCharmList(el, state) {
  const c = currentCard(state);
  el.innerHTML = c.parties.slice(0, c.filled).map(p => {
    const ch = charmFor(p);
    return `<li><span class="dot" style="background:${ch.color}"></span>${escapeHtml(partyLabel(p))}<small>${escapeHtml(p.date || '')}</small></li>`;
  }).join('');
}
