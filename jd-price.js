// ============================================================
// 京东APP · 商品详情页比价（查表版）
// 触发接口: https://api.m.jd.com/client.action（全部 functionId）
//
// 背景（抓包实证，2026-10-15）：
//   1. 京东核心商品接口（带价格那个，wareBusiness 等）做了 SSL 证书固定，
//      抓包完全看不到明文 → 原生价格响应无法注入。
//   2. api.m.jd.com 未固定、抓得到；sku_interp_title 响应里嵌套 skuId
//      （data[].ai_info[].sku_list[].skuId，顶层也有 ai_info），
//      但该 AI 接口重复进入会返回空数据 → 不能只依赖它一个。
//      因此改为拦截【全部 api.m.jd.com/client.action】，递归找商品号，
//      哪个响应带了盯着的 sku 就动作，覆盖面最大。
//   3. 慢慢买 priceRemark 的 sign/token 与请求参数绑定，无法现算任意商品，
//      故用【按 skuId 查表】。每盯一个商品，抓一次慢慢买响应，固化到 TRACKED。
//
// 流程：
//   1. 拦截 api.m.jd.com/client.action 响应 → 递归取出 skuId
//   2. TRACKED 命中 → 弹 QX 通知（必现，60s 去重）
//       + 可选：把比价伪装成一条 AI 卡片塞进 ai_info，尝试渲染在标题下方
//   3. 未命中 → 原样放行
//
// 订阅用法：QX → 重写(Rewrite) 订阅 → 填 conf raw 地址（见 jd-price.conf）
// 临时关闭：URL 后加 &__price=0
// ============================================================

const CONFIG = {
  // 每个想盯的商品一条：{ skuId: 摘要 }。数据来自慢慢买 priceRemark 响应。
  TRACKED: {
    "10081811486701": {
      name: "外语/语言文字类目商品",
      currentPrice: "59",
      status: "持平常卖价",
      lowestPrice: "52.5",
      lowestDate: "2026-01-31",
      lowPct: "16%",
      advice: "价格偏高",
      star: 1.0,
      expectPrice: "52.5",
      rows: [
        { label: "当前价",  price: "¥59",  tip: "低于历史价中16%的时段" },
        { label: "历史最低", price: "¥52.5", date: "2026-01-31", diff: "省6.5" },
        { label: "双11价",  price: "¥52.7", date: "2025-10-24", diff: "省6.3" },
      ],
    },
  },

  // 命中后是否弹 QX 通知（不依赖页面渲染，必现）
  POST_NOTIFY: true,

  // 是否尝试把比价伪装成一条 AI 卡片塞进 ai_info（可能渲染在标题下方那节）。
  // 若 APP 不接受改动的响应导致异常，改成 false 只留通知。
  INJECT_AI: true,

  // 同一商品两次动作的最小间隔（毫秒），防重复弹/重复插卡片
  DEDUP_MS: 60000,
};

function log() {
  console.log("[京东比价] " + Array.prototype.join.call(arguments, " "));
}

// 开关：URL 带 __price=0 时跳过
if (/[?&]__price=0/.test($request.url)) {
  log("检测到 __price=0，跳过比价");
  $done({});
} else {
  main();
}

function main() {
  var body = $response.body;
  var obj = null;
  try {
    obj = JSON.parse(body);
  } catch (e) {
    log("响应不是 JSON：" + (e && e.message));
    $done({});
    return;
  }

  var skuId = findSku(obj);
  log("顶层键: " + Object.keys(obj).join(",") + " | skuId=" + skuId);

  if (!skuId || !CONFIG.TRACKED[skuId]) {
    log(skuId ? ("未收录该 sku(" + skuId + ")，放行") : "未取到 skuId，放行");
    $done({});
    return;
  }

  var item = CONFIG.TRACKED[skuId];
  var note = buildNote(item);

  // 60s 去重：同一商品短时间内不重复弹/重复插，避免 spam
  if (!shouldAct(skuId)) {
    log("命中但 60s 内已处理过，跳过 (" + skuId + ")");
    $done({});
    return;
  }
  log("命中 -> " + note);

  if (CONFIG.POST_NOTIFY) {
    try {
      $notification.post("京东比价 · " + item.currentPrice + "元", note, item.name || "");
    } catch (e) {}
  }

  var changed = false;
  if (CONFIG.INJECT_AI) {
    changed = injectAiCard(obj, skuId, note);
  }

  if (changed) {
    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
}

// 60s 去重：用 $prefs 持久化记录上次动作时间
function shouldAct(skuId) {
  var k = "jd_price_act_" + skuId;
  var now = Date.now();
  try {
    var last = $prefs.get(k) ? parseInt($prefs.get(k)) : 0;
    if (now - last < CONFIG.DEDUP_MS) return false;
    $prefs.set(k, String(now));
  } catch (e) {}
  return true;
}

// 从响应里递归找 skuId（sku_interp_title 等在 data[].ai_info[].sku_list[].skuId 等深层）
function findSku(o) {
  var found = [];
  collectSku(o, found);
  return found.length ? found[0] : "";
}

function collectSku(o, out) {
  if (o === null || typeof o !== "object") return;
  if (Array.isArray(o)) {
    for (var i = 0; i < o.length; i++) collectSku(o[i], out);
    return;
  }
  for (var k in o) {
    if (k === "skuId" && typeof o[k] === "string" && o[k]) out.push(o[k]);
    else collectSku(o[k], out);
  }
}

// 把比价伪装成一条 AI 卡片，塞进 data[] 和 ai_info[]
function injectAiCard(obj, skuId, note) {
  var card = {
    "dongdong": "0",
    "sku_list": [{ "storeId": "", "skuId": skuId }],
    "channel": "30",
    "content": note,
  };
  var entry = { "name": "慢慢买 · 历史比价", "ai_info": [card] };
  var did = false;

  if (Array.isArray(obj.data)) {
    // 每个 data 元素的 ai_info 也追加，增大被渲染的几率
    for (var i = 0; i < obj.data.length; i++) {
      var d = obj.data[i];
      if (d && Array.isArray(d.ai_info)) { d.ai_info.push(card); did = true; }
    }
    obj.data.push(entry);
    did = true;
  }
  if (Array.isArray(obj.ai_info)) {
    obj.ai_info.push(card);
    did = true;
  }
  if (did) log("已注入 AI 卡片（名称下方那节）");
  return did;
}

// 拼比价文案
function buildNote(item) {
  var lines = [];
  if (item.rows) {
    item.rows.forEach(function (r) {
      var s = r.label + " " + r.price;
      if (r.date) s += " @" + r.date;
      if (r.diff) s += " (" + r.diff + ")";
      if (r.tip) s += " ·" + r.tip;
      lines.push(s);
    });
  }
  if (item.lowestPrice) lines.push("历史最低 " + item.lowestPrice + (item.lowestDate ? " @" + item.lowestDate : ""));
  if (item.status) lines.push("状态 " + item.status);
  if (item.advice) lines.push("建议 " + item.advice + (item.expectPrice ? "（期望到手价 " + item.expectPrice + "）" : ""));
  return lines.join(" ｜ ");
}
