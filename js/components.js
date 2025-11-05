// js/components.js
// 드롭다운 컴포넌트 함수 분리

export function renderDropdown(id, selected = 'mantra') {
  const options = [
    { value: 'mantra', label: 'Mantra' },
    { value: 'stock-a', label: 'Stock A' },
    { value: 'stock-b', label: 'Stock B' },
    { value: 'stock-c', label: 'Stock C' },
  ];

  return `
    <div class="relative w-[281px] h-12">
      <label for="${id}" class="sr-only">자산 선택</label>
      <select
        id="${id}"
        name="asset"
        class="appearance-none w-full h-12 px-4 pr-11 rounded-lg border border-gray800 bg-panel text-[15px] outline-none focus:border-accent focus:ring-0 focus:shadow-[0_0_0_3px_rgba(0,255,204,0.18)] cursor-pointer"
      >
        ${options.map(opt =>
          `<option value="${opt.value}" ${opt.value === selected ? 'selected' : ''}>${opt.label}</option>`
        ).join('')}
      </select>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 h-4 w-4 opacity-90 bg-[url('../image/icn_arrow_btm_24.png')] bg-center bg-contain bg-no-repeat"
      ></span>
    </div>
  `;
}
