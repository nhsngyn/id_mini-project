// js/index.js
// 메인 초기화 스크립트

import { loadCandles, normalizeOHLCV, createHoverSync, readInlineJSON } from './shared.js';
import { initPriceChart, updatePriceWindow } from './priceChart.js';
import { initVolumeChart, updateVolumeWindow } from './volumeChart.js';
import { renderDropdown } from './components.js';

// 💡 DOM이 완전히 준비된 후 실행
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('dropdown-container');
  if (!container) {
    console.error('[index] dropdown-container가 존재하지 않아요!');
    return;
  }

  container.innerHTML = renderDropdown('asset-select', 'mantra');

  const state = {
    data: null,
    window: { start: 0, end: 1 },
    charts: { price: null, volume: null },
  };

  const fileMap = {
    mantra: 'mantra_60days.json',
    'stock-a': 'stock_a_60days.json',
    'stock-b': 'stock_b_60days.json',
    'stock-c': 'stock_c_60days.json',
  };

  const $asset = document.getElementById('asset-select');
  const $price = document.getElementById('priceChart');
  const $vol = document.getElementById('volumeChart');
  const $badge = document.getElementById('badge-range');
  const $loading = document.getElementById('loading');

  async function loadRows(assetKey) {
    const inline = readInlineJSON();
    if (inline && Array.isArray(inline)) {
      console.log('[index] using inline JSON (#ohlcv)');
      return inline;
    }
    const file = fileMap[assetKey] ?? fileMap.mantra;
    const url = `./data/${file}`;
    console.log('[index] fetch', url);
    return await loadCandles(url);
  }

  async function loadAndRender(assetKey) {
    try {
      $loading?.classList.remove('hidden');

      const raw = await loadRows(assetKey);
      state.data = normalizeOHLCV(raw);
      if (!state.data.length) {
        throw new Error('정규화 결과가 비었어요. JSON 스키마/값을 확인해줘!');
      }

      if (!state.charts.price) {
        state.charts.price = initPriceChart($price, state.data);
        state.charts.volume = initVolumeChart($vol, state.data);
        createHoverSync(state.charts.price, state.charts.volume, state.data);

        window.addEventListener('resize', () => {
          state.charts.price?.resize?.();
          state.charts.volume?.resize?.();
        });
      } else {
        updatePriceWindow(state.charts.price, state.data, state.window);
        updateVolumeWindow(state.charts.volume, state.data, state.window);
      }

      if ($badge) {
        $badge.textContent = '60 Days (25/08/18–10/16)';
      }

      console.log('[index] 차트 렌더링 완료');
    } catch (e) {
      console.error('[index] 로드 중 오류 발생', e);
      const box = document.createElement('div');
      box.style.cssText =
        'color:#f87171;background:rgba(248,113,113,.1);padding:12px;border:1px solid rgba(248,113,113,.4);border-radius:8px;margin:8px 0;';
      box.textContent = `에러: ${e?.message || e}`;
      $price?.appendChild(box);
    } finally {
      $loading?.classList.add('hidden');
    }
  }

  // 초기 로드 + 드롭다운 이벤트 핸들
  loadAndRender($asset.value).catch((e) =>
    console.error('[index] 초기 로드 에러', e)
  );

  $asset.addEventListener('change', () => {
    loadAndRender($asset.value).catch((e) =>
      console.error('[index] 드롭다운 변경 에러', e)
    );
  });
});
