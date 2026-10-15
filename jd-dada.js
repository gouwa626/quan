// ============================================================
// 京东秒送骑士 · 骑士餐厅入口注入
// 目标接口: https://color.imdada.cn/?functionId=getBizActivityInfo
//
// 作用：把响应里的 detailList 从空数组改为有值，
//      使 H5 渲染「肯德基&必胜客」图片按钮。
//
// 背景（抓包实证）：
//   正常抓到餐厅列表时，detailList 有 1 条，内含 332 城市白名单；
//   拿不到列表时，detailList 为 []，页面什么都不渲染。
//   差异在 cipher 里的 City-Id / Ad-Code（城市归属），与 GPS 坐标无关。
//
// 订阅用法：QX → 订阅资源 → 填 raw 地址（见 jd-dada.conf）
// 临时关闭：在原 URL 后加 &__inject=0
// ============================================================

const ACTIVITY = {
  "id": 1,
  "activityId": 1,
  "name": "肯德基&必胜客",
  "detailPicUrl": "https://media-transporter-jd.imdada.cn/55/edec656d0167499ab212c879effdd363.png",
  "redirectUrl": "https://appmall.yumchina.com/bsh-enterprise-h5/packages/bsh/corporations/start?egs_name=jdqs&support_business=1&enterprise_code=4d0182838dd1469f8cad3704517aeb30&brand_type=3",
  "isAuth": 1,
  "needPin": 0,
  "sort": 2,
  "cityList": "[2,1,317,318,189,322,194,193,340,341,6,344,191,190,192,154,125,120,170,169,180,123,30,171,178,115,15,114,69,14,72,73,74,75,79,83,84,85,86,87,88,91,93,94,97,98,112,205,9,49,32,33,54,25,57,34,58,26,67,8,50,55,4,61,63,36,28,5,65,59,7,66,17,139,136,182,140,167,176,16,142,119,144,122,39,38,10,117,133,185,124,128,138,127,130,153,126,134,173,141,236,228,21,239,240,229,242,166,245,164,246,249,253,241,225,211,219,224,143,223,222,215,294,213,299,298,297,132,296,295,214,293,233,234,151,243,247,248,250,152,174,146,149,235,18,237,177,238,172,217,184,244,165,218,129,251,11,163,305,159,148,259,270,268,261,258,267,118,269,264,262,263,260,265,266,277,275,276,187,278,271,274,179,257,155,168,256,204,186,24,145,254,255,283,288,284,282,365,220,279,287,281,156,286,226,227,252,273,364,355,285,363,12,43,44,45,46,47,48,3,51,52,53,56,40,62,60,27,64,137,304,301,302,147,150,160,300,181,157,135,303,131,161,319,202,323,326,327,29,332,337,347,203,350,210,289,209,158,22,188,290,212,19,291,116,216,31,35,292,208,68,100,76,82,206,207,372,92,99,367,78,366,371,370,368,70,102,42,105,113,103,77,80,81,106,89,90,104,111,95,96,315,316,199,321,329,338,345,346,349,351,201,352,13,200,314,320,325,328,41,330,197,331,333,335,336,195,198,348,23,196,353]",
  "tspIds": "",
  "linkJdActivity": 0,
  "jdActivityId": "",
  "detailDescUrl": "",
  "backgroundUrl": "",
  "cutOffTime": "",
  "isDel": 0,
  "createTime": 1764174029000,
  "updateTime": 1766073704000
};

function log() {
  console.log("[骑士餐厅] " + Array.prototype.join.call(arguments, " "));
}

function fullReplace(activity) {
  $done({
    body: JSON.stringify({
      status: "ok",
      content: {
        activityLinkUrl:
          "https://media-order-jd.imdada.cn/62/a1d20c74f69b4f16945c1523b943a06d.png",
        tipsPicUrl:
          "https://media-transporter-jd.imdada.cn/55/0b8c3ca5eda14721ad21d1b2b53e341e.png",
        detailList: [activity],
      },
    }),
  });
}

// 开关：URL 带 __inject=0 时不注入（注意 QX 顶层不能用 return）
if (/[?&]__inject=0/.test($request.url)) {
  log("检测到 __inject=0，跳过注入");
  $done({});
} else {
  var obj = null;
  var ok = true;

  try {
    obj = JSON.parse($response.body);
  } catch (e) {
    ok = false;
  }

  if (!ok || !obj || typeof obj !== "object") {
    // 原响应不是预期格式，整体替换，避免前端拿不到数据
    log("原响应解析失败，整体替换");
    fullReplace(ACTIVITY);
  } else {
    var before =
      obj.content && Array.isArray(obj.content.detailList)
        ? obj.content.detailList.length
        : -1;

    // 只补 detailList，保留服务端下发的其他字段
    if (!obj.content) obj.content = {};
    obj.content.detailList = [ACTIVITY];

    log("注入完成 detailList: " + before + " -> 1");
    log("name=" + ACTIVITY.name + " cityList=" + JSON.parse(ACTIVITY.cityList).length + "城");

    $done({ body: JSON.stringify(obj) });
  }
}
