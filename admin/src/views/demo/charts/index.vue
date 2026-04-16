<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, nextTick } from 'vue';
import { NButton, NCard, NSpace } from 'naive-ui';
import * as echarts from 'echarts';

type MockChartData = {
  categories: string[];
  line: number[];
  bar: number[];
  pie: Array<{ name: string; value: number }>;
  radar: {
    indicator: Array<{ name: string; max: number }>;
    value: number[];
  };
};

const refreshSeed = ref(0);

const mockData = reactive<MockChartData>({
  categories: [],
  line: [],
  bar: [],
  pie: [],
  radar: {
    indicator: [],
    value: [],
  },
});

const buildMockData = (seed: number): MockChartData => {
  // 简单的伪随机：避免引入额外依赖
  const rand = (min: number, max: number) => {
    const x = Math.sin(seed + min * 1000 + max * 10) * 10000;
    const t = x - Math.floor(x);
    return min + t * (max - min);
  };

  const categories = Array.from({ length: 7 }, (_v, i) => `D${i + 1}`);
  const line = categories.map((_c, i) => Math.round(rand(20 + i, 90 + i)));
  const bar = categories.map((_c, i) => Math.round(rand(10 + i, 70 + i)));
  const pie = [
    { name: '模块A', value: Math.round(rand(10, 60)) },
    { name: '模块B', value: Math.round(rand(10, 60)) },
    { name: '模块C', value: Math.round(rand(10, 60)) },
    { name: '模块D', value: Math.round(rand(10, 60)) },
  ];
  const radarNames = ['可用性', '性能', '安全性', '可观测性', '扩展性'];
  const radarIndicator = radarNames.map((name) => ({ name, max: 100 }));
  const radarValue = radarNames.map((_n, idx) =>
    Math.round(rand(40 + idx, 95 + idx)),
  );

  return {
    categories,
    line,
    bar,
    pie,
    radar: {
      indicator: radarIndicator,
      value: radarValue,
    },
  };
};

const applyMockData = (seed: number) => {
  const data = buildMockData(seed);
  mockData.categories = data.categories;
  mockData.line = data.line;
  mockData.bar = data.bar;
  mockData.pie = data.pie;
  mockData.radar.indicator = data.radar.indicator;
  mockData.radar.value = data.radar.value;
};

const lineEl = ref<HTMLDivElement | null>(null);
const barEl = ref<HTMLDivElement | null>(null);
const pieEl = ref<HTMLDivElement | null>(null);
const radarEl = ref<HTMLDivElement | null>(null);

let lineChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
let radarChart: echarts.ECharts | null = null;

const resizeHandler = () => {
  lineChart?.resize();
  barChart?.resize();
  pieChart?.resize();
  radarChart?.resize();
};

const applyOptions = () => {
  if (lineChart) {
    lineChart.setOption({
      title: { text: '折线趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      grid: { left: 20, right: 20, top: 56, bottom: 20 },
      xAxis: { type: 'category', data: mockData.categories },
      yAxis: { type: 'value' },
      series: [
        {
          name: '数值',
          type: 'line',
          data: mockData.line,
          smooth: true,
          symbolSize: 8,
          areaStyle: { opacity: 0.12 },
        },
      ],
    });
  }

  if (barChart) {
    barChart.setOption({
      title: { text: '柱状对比', left: 'center' },
      tooltip: { trigger: 'axis' },
      grid: { left: 20, right: 20, top: 56, bottom: 20 },
      xAxis: { type: 'category', data: mockData.categories },
      yAxis: { type: 'value' },
      series: [
        {
          name: '数量',
          type: 'bar',
          data: mockData.bar,
          barWidth: 26,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        },
      ],
    });
  }

  if (pieChart) {
    pieChart.setOption({
      title: { text: '饼图占比', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '占比',
          type: 'pie',
          radius: ['35%', '70%'],
          center: ['50%', '55%'],
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { formatter: '{b}: {d}%' },
          data: mockData.pie,
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0 } },
        },
      ],
    });
  }

  if (radarChart) {
    radarChart.setOption({
      title: { text: '雷达能力评分', left: 'center' },
      tooltip: {},
      radar: {
        indicator: mockData.radar.indicator,
        radius: '65%',
      },
      series: [
        {
          name: '评分',
          type: 'radar',
          data: [{ value: mockData.radar.value, name: 'Harbor' }],
        },
      ],
    });
  }
};

const initCharts = () => {
  if (lineEl.value) {
    lineChart = echarts.init(lineEl.value);
  }
  if (barEl.value) {
    barChart = echarts.init(barEl.value);
  }
  if (pieEl.value) {
    pieChart = echarts.init(pieEl.value);
  }
  if (radarEl.value) {
    radarChart = echarts.init(radarEl.value);
  }

  applyOptions();
};

const refreshAll = async () => {
  refreshSeed.value += 1;
  applyMockData(refreshSeed.value);
  applyOptions();
};

onMounted(async () => {
  await nextTick();
  applyMockData(refreshSeed.value);
  initCharts();
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  lineChart?.dispose();
  barChart?.dispose();
  pieChart?.dispose();
  radarChart?.dispose();
});
</script>

<template>
  <div class="charts-root">
    <NSpace justify="space-between" align="center" class="charts-toolbar">
      <div>
        <div class="charts-title">图表能力演示</div>
        <div class="charts-subtitle">
          包含折线 / 柱状 / 饼图 / 雷达 等多种形式
        </div>
      </div>
      <NSpace>
        <NButton type="primary" @click="refreshAll">刷新数据</NButton>
      </NSpace>
    </NSpace>

    <div class="charts-grid">
      <NCard title="折线趋势" :bordered="false" class="charts-card">
        <div ref="lineEl" class="chart" />
      </NCard>

      <NCard title="柱状对比" :bordered="false" class="charts-card">
        <div ref="barEl" class="chart" />
      </NCard>

      <NCard title="饼图占比" :bordered="false" class="charts-card">
        <div ref="pieEl" class="chart chart--pie" />
      </NCard>

      <NCard title="雷达能力评分" :bordered="false" class="charts-card">
        <div ref="radarEl" class="chart chart--radar" />
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.charts-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.charts-toolbar {
  flex-wrap: wrap;
}

.charts-title {
  font-weight: 600;
  font-size: 16px;
}

.charts-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

/* 让 ECharts 容器有高度，否则无法正确渲染 */
.chart {
  width: 100%;
  height: 260px;
}

.chart--pie {
  height: 240px;
}

.chart--radar {
  height: 240px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.charts-card :deep(.n-card__content) {
  padding-top: 8px;
}
</style>
