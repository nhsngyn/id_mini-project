
const upColor = '#0FA76C';   // 상승색
const downColor = '#C93C50'; // 하락색
const hoverBand = 'rgba(55,60,66,0.30)'; // 호버 밴드 색상

/* =========================
   데이터 유틸 (간소화 버전)
   ========================= */

// 1) 인라인 JSON 읽기 (id: ohlcv)
function readInlineJSON() {
  const el = document.getElementById('ohlcv');
  if (!el) return null;
  try {
    const txt = el.textContent.trim();
    if (!txt) return null;
    return JSON.parse(txt);
  } catch (e) {
    console.error('JSON 파싱 실패(ohlcv):', e);
    return null;
  }
}

// 2) 파싱: 고정 스키마 [d, o, c, l, h, v] + 오름차순 날짜를 가정
function splitData(raw) {
  const categoryData = [], values = [], volumes = [];
  if (!Array.isArray(raw) || raw.length === 0) return { categoryData, values, volumes };

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.length < 6) continue;

    const date = String(r[0]);
    const open = Number(r[1]);
    const close = Number(r[2]);
    const low = Number(r[3]);
    const high = Number(r[4]);
    const vol = Number(r[5]);

    categoryData.push(date);
    values.push([open, close, low, high]); // ECharts가 요구하는 순서(O C L H)
    const dir = open > close ? 1 : -1;     // 하락=1, 상승=-1 (visualMap과 맞춤)
    volumes.push([i, vol, dir]);
  }

  return { categoryData, values, volumes };
}

/* =========================
   차트 옵션
   ========================= */


// 배지 업데이트
function updateBadges(categoryData) {
  const fmt = (ds) => {
    const [y, m, d] = String(ds).split('-');
    return m && d ? `${m}/${d}` : ds;
  };
  const days = categoryData.length; //days data.length - 1;
  const first = categoryData[0];
  const last = categoryData[days - 1];
  document.getElementById('badge-interval').textContent = '1 Day';
  document.getElementById('badge-range').textContent =
    days ? `${days} Days (${fmt(first)}–${fmt(last)})` : '—';
}

// fetch 유틸
async function loadJSON(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('fetch 실패:', url, e);
    return null;
  }
}

// 차트 초기화
const chart = echarts.init(document.getElementById('chart'), null, { renderer: 'canvas' });

// 부트스트랩: 데이터 주입 경로
async function boot(preferredFile) {
  let raw = readInlineJSON();                                      // 1) inline (#ohlcv)
  if (!raw && Array.isArray(window.rawData)) raw = window.rawData; // 2) 전역
  if (!raw) {                                                      // 3) 파일
    const candidate = preferredFile || 'mantra.json';
    raw = await loadJSON(candidate);
  }

  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    const toast = document.createElement('div');
    toast.textContent = '데이터가 없습니다.';
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md bg-red-500/90 text-white text-sm shadow';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
    return;
  }

  const parsed = splitData(raw);           // ★ 고정 스키마(O C L H V) 가정
  chart.setOption(buildOption(parsed), true);
  updateBadges(parsed.categoryData);

  // ▼ 가시 구간(줌/스크롤) 기준으로 오른쪽 배지 갱신
  function setRangeBadge(days, first, last) {
    const fmt = (ds) => {
      const [y, m, d] = String(ds).split(/[-/]/);
      return m && d ? `${m}/${d}` : ds;
    };
    const el = document.getElementById('badge-range');
    if (!el) return;
    el.textContent = days ? `${days} Days (${fmt(first)}–${fmt(last)})` : '—';
  }

  function updateRangeBadgeFromXAxis() {
    const xAxisModel0 = chart.getModel().getComponent('xAxis', 0);
    if (!xAxisModel0) return;
    // 현재 화면에 보이는 데이터 인덱스 구간
    const extentIdx = xAxisModel0.axis.scale.getExtent(); // [minIdx, maxIdx] (실수 가능)
    const start = Math.max(0, Math.floor(extentIdx[0]));
    const end = Math.min(parsed.categoryData.length - 1, Math.ceil(extentIdx[1]));
    if (end < start) { setRangeBadge(0, '', ''); return; }
    const days = end - start + 1;
    const first = parsed.categoryData[start];
    const last = parsed.categoryData[end];
    setRangeBadge(days, first, last);
  }

  // 초기 표시(현재 뷰 기준으로 덮어쓰기)
  updateRangeBadgeFromXAxis();

  // 데이터 줌/스크롤로 범위가 바뀔 때 배지 갱신
  chart.off('dataZoom');
  chart.on('dataZoom', () => {
    updateRangeBadgeFromXAxis();
  });

  // 차트 리사이즈 후에도 안전하게 재계산
  chart.off('finished'); // 중복 방지
  chart.on('finished', () => {
    updateRangeBadgeFromXAxis();
  });

  function updateGlobalHoverLine(zrX) {
    const h = chart.getHeight();
    chart.setOption({
      graphic: [{
        id: 'global-hover-line',
        invisible: false,
        shape: { x1: zrX, y1: 0, x2: zrX, y2: h }
      }]
    }, { silent: true });
  }

  // ✅ 캔들 폭에 맞춰 세로 axisPointer 두께 자동 동기화 + 글로벌 호버 라인 이동
  chart.off('updateAxisPointer');
  chart.on('updateAxisPointer', function (params) {
    // (1) 막대폭 기반으로 세로 밴드/라인 두께 동기화
    const xAxisModel0 = chart.getModel().getComponent('xAxis', 0);
    if (xAxisModel0) {
      const extentIdx = xAxisModel0.axis.scale.getExtent();
      const extentPx = xAxisModel0.axis.getExtent();
      const pixelW = Math.abs(extentPx[1] - extentPx[0]);
      const count = Math.max(1, extentIdx[1] - extentIdx[0]);
      const barW = pixelW / count;
      chart.setOption({ xAxis: [{ axisPointer: { lineStyle: { width: barW } } }] }, false);
    }

    // (2) 글로벌 세로 호버 라인 이동 (마우스 X픽셀)
    const zrX = params && params.event && params.event.event && params.event.event.zrX;
    if (typeof zrX === 'number') {
      updateGlobalHoverLine(zrX);
    }

    // (3) 현재 x 인덱스 계산
    const axesInfo = (params && params.axesInfo) || [];
    const xInfo0 = axesInfo.find(a => a.axisDim === 'x' && a.axisIndex === 0);
    if (!xInfo0) return;
    const idx = xInfo0.value;

    // (4) 데이터에서 OPEN, VOLUME 추출
    const k = parsed.values[idx];                  // [open, close, low, high]
    if (!k) return;
    const open = Number(k[0]);

    let volume = null;
    const volDatum = parsed.volumes[idx];          // [i, vol, dir] or number
    if (Array.isArray(volDatum)) volume = Number(volDatum[1]);
    else if (Number.isFinite(+volDatum)) volume = Number(volDatum);

    // (5) 픽셀 좌표로 변환 (각 그리드의 x축 픽셀 범위 사용)
    const xAxisModel1 = chart.getModel().getComponent('xAxis', 1);
    const [x0s, x0e] = xAxisModel0 ? xAxisModel0.axis.getExtent() : [0, chart.getWidth()];
    const [x1s, x1e] = xAxisModel1 ? xAxisModel1.axis.getExtent() : [0, chart.getWidth()];

    const yPxOpen = chart.convertToPixel({ gridIndex: 0, yAxisIndex: 0 }, open);
    const yPxVol = chart.convertToPixel({ gridIndex: 1, yAxisIndex: 1 }, volume);

    // (6) 값 포맷터 (가격: 소수점 X / 필요시 바꿔도 됨, 볼륨: K/M/B)
    const fmtPrice = (n) => Number.isFinite(n) ? n.toFixed(3) : '—';
    const fmtVol = (n) => {
      if (!Number.isFinite(n)) return '—';
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
      return String(n);
    };

    // (7) 가로선과 배지 업데이트 (라인은 그리드의 양끝까지)
    const badgePad = 8; // 왼쪽 여백
    const leftEdgePrice = x0s + badgePad;
    const leftEdgeVolume = x1s + badgePad;

    // (8) 그래픽 요소 업데이트
    chart.setOption({
      graphic: [
        // Price OPEN line
        {
          id: 'price-open-line',
          type: 'line',
          z: 200,
          silent: true,
          invisible: !Number.isFinite(yPxOpen),
          shape: { x1: x0s + 75, y1: yPxOpen, x2: x0e + 70, y2: yPxOpen },
          style: { stroke: '#6D89AB', lineWidth: 1, opacity: 0.7 }
        },

        // Price badge
        {
          id: 'price-open-badge',
          type: 'group',
          z: 200,
          silent: true,
          invisible: !Number.isFinite(yPxOpen),
          left: leftEdgePrice,
          top: yPxOpen - 12,
          children: [
            {
              type: 'rect'
            },
            {
              type: 'rect',
              shape: { x: 0, y: 0, width: 66, height: 22, r: 2 },
              style: {
                fill: 'rgba(34,39,47,0.90)',   // ✅ 배경색(짙은 회색)
                stroke: '#6D89AB',
                lineWidth: 2
              }
            },
            {
              type: 'text',
              style: {
                x: 18, y: 5,
                text: fmtPrice(open),
                fill: '#E4E6ED',               // ✅ 글자색(밝은 회색)
                font: '12px Poppins, sans-serif'
              }
            }
          ]
        },

        // Volume line
        {
          id: 'volume-line',
          type: 'line',
          z: 200,
          silent: true,
          invisible: !Number.isFinite(yPxVol),
          shape: { x1: x1s + 75, y1: yPxVol, x2: x1e + 70, y2: yPxVol },
          style: { stroke: '#6D89AB', lineWidth: 1, opacity: 0.7 }
        },

        // Volume badge
        {
          id: 'volume-badge',
          type: 'group',
          z: 200,
          silent: true,
          invisible: !Number.isFinite(yPxVol),
          left: leftEdgeVolume,
          top: yPxVol - 12,
          children: [
            {
              type: 'rect',
              shape: { x: 0, y: 0, width: 66, height: 22, r: 2 },
              style: {
                fill: 'rgba(34,39,47,0.90)',   // ✅ 여기서도 배경 지정
                stroke: '#6D89AB',
                lineWidth: 2
              }
            },
            {
              type: 'text',
              style: {
                x: 20, y: 5,
                text: fmtVol(volume),
                fill: '#E4E6ED',
                font: '12px Poppins, sans-serif'
              }
            }
          ]
        }
      ]
    }, { silent: true });
  });

  // (옵션) 마우스 아웃 시 price 패널 고정선 제거
  chart.getZr().off('mouseout');
  chart.getZr().on('mouseout', () => {
    chart.setOption({ series: [{ id: 'price', markLine: { data: [] } }] }, false);
  });
  chart.getZr().off('globalout');
  chart.getZr().on('globalout', () => {
    chart.setOption({
      graphic: [
        { id: 'global-hover-line', invisible: true },
        { id: 'price-open-line', invisible: true },
        { id: 'price-open-badge', invisible: true },
        { id: 'volume-line', invisible: true },
        { id: 'volume-badge', invisible: true }
      ]
    }, { silent: true });
  });
}

// 드롭다운으로 파일 전환
document.getElementById('asset').addEventListener('change', async (e) => {
  const asset = e.target.value; // 'mantra' | 'bitcoin' | 'ethereum'
  await boot(`${asset}.json`);
});

// 최초 실행 (기본: mantra_60days.json)
boot();

window.addEventListener('resize', () => chart.resize());   