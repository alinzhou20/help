<template>
  <section class="dashboard">
    <div class="dashboard-container">
      <div class="header-card">
        <div class="title-section">
          <Icon icon="material-symbols:dashboard-rounded" class="dashboard-icon" />
          <h2 class="dashboard-title">实时数据看板</h2>
          <span class="subtitle">小组得星统计</span>
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <Icon icon="material-symbols:groups" class="stat-icon groups" />
            <div class="stat-info">
              <span class="stat-value">{{ totalGroups }}</span>
              <span class="stat-label">参与小组</span>
            </div>
          </div>
          <div class="stat-card">
            <Icon icon="material-symbols:wifi" class="stat-icon online" />
            <div class="stat-info">
              <span class="stat-value">{{ onlineCount }}</span>
              <span class="stat-label">在线小组</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">各活动得星分布</h3>
          <div class="legend">
            <div class="legend-item">
              <span class="legend-dot a1"></span>
              <span class="legend-text">活动一</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot a2"></span>
              <span class="legend-text">活动二</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot a3"></span>
              <span class="legend-text">活动三</span>
            </div>
          </div>
        </div>
        <div ref="chartEl" class="chart"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect, computed, nextTick } from 'vue'
import { useTeacherDataStore } from '@/stores/useTeacherDataStore'
import { emit } from '@/utils/realtime'
import * as echarts from 'echarts'
import { Icon } from '@iconify/vue'

const tds = useTeacherDataStore()
const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let pingTimer: any = null

const groups = computed(() => tds.groups.map(g => `${g}组`))
const totalGroups = computed(() => tds.groups.length)
const onlineCount = computed(() => tds.onlineGroups.length)

const seriesData = computed(() => {
  const a1 = [] as number[]
  const a2 = [] as number[]
  const a3 = [] as number[]
  const totals = [] as number[]
  
  for (const g of tds.groups) {
    const d = tds.dataByGroup[String(g)]
    const v1 = d?.stars?.a1 ?? 0
    const v2 = d?.stars?.a2 ?? 0
    const v3 = d?.stars?.a3 ?? 0
    
    a1.push(v1)
    a2.push(v2)
    a3.push(v3)
    totals.push(v1 + v2 + v3)
  }
  return { a1, a2, a3, totals }
})


function render() {
  if (!chartEl.value) return
  if (!chart) chart = echarts.init(chartEl.value)
  
  const online = new Set(tds.onlineGroups.map(g => `${g}组`))
  
  chart.setOption({
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { 
        type: 'shadow',
        shadowStyle: {
          shadowColor: 'rgba(0, 0, 0, 0.08)'
        }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      }
    },
    grid: { 
      left: 50, 
      right: 30, 
      top: 40, 
      bottom: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: groups.value,
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: (val: string) => online.has(val) ? '#3b82f6' : '#6b7280',
        fontWeight: (val: string) => online.has(val) ? '700' : '400',
        fontSize: 12
      }
    },
    yAxis: { 
      type: 'value', 
      min: 0,
      max: 8,
      interval: 1,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 12
      }
    },
    legend: { show: false },
    series: [
      { 
        name: '活动一', 
        type: 'bar', 
        stack: 'stars', 
        data: seriesData.value.a1, 
        itemStyle: { 
          color: '#3b82f6',
          borderRadius: [0, 0, 0, 0]
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            return params.value > 0 ? params.value : ''
          },
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold'
        },
        emphasis: {
          itemStyle: {
            color: '#2563eb'
          }
        }
      },
      { 
        name: '活动二', 
        type: 'bar', 
        stack: 'stars', 
        data: seriesData.value.a2, 
        itemStyle: { 
          color: '#8b5cf6',
          borderRadius: [0, 0, 0, 0]
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            return params.value > 0 ? params.value : ''
          },
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold'
        },
        emphasis: {
          itemStyle: {
            color: '#7c3aed'
          }
        }
      },
      { 
        name: '活动三', 
        type: 'bar', 
        stack: 'stars', 
        data: seriesData.value.a3, 
        itemStyle: { 
          color: '#10b981',
          borderRadius: [2, 2, 0, 0]
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            return params.value > 0 ? params.value : ''
          },
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold'
        },
        emphasis: {
          itemStyle: {
            color: '#059669'
          }
        }
      },
      // 使用scatter类型来显示总数
      {
        name: '总计',
        type: 'scatter',
        data: seriesData.value.totals.map((total, idx) => [idx, total]),
        symbolSize: 0,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const total = params.value[1]
            return total > 0 ? `${total}` : ''
          },
          color: '#1f2937',
          fontSize: 14,
          fontWeight: 'bold',
          distance: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: [2, 6],
          borderRadius: 4,
          borderColor: '#e5e7eb',
          borderWidth: 1
        },
        emphasis: {
          scale: false
        },
        silent: true
      }
    ],
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  }, { notMerge: true, lazyUpdate: false })
  
  // 响应式调整
  window.addEventListener('resize', () => {
    chart?.resize()
  })
}

onMounted(() => {
  tds.start()
  render()
  // 广播一次并周期性 ping，触发学生端回报在线和星星
  try { emit({ type: 'teacher:ping' }) } catch {}
  // 将ping间隔从5秒减少到2秒，提高实时性
  pingTimer = setInterval(() => { try { emit({ type: 'teacher:ping' }) } catch {} }, 2000)
})

onUnmounted(() => {
  tds.stop()
  if (pingTimer) { try { clearInterval(pingTimer) } catch {} pingTimer = null }
  if (chart) { try { chart.dispose() } catch {} chart = null }
})

watchEffect(() => {
  // 读取依赖，触发响应：
  void groups.value
  void seriesData.value
  // onlineGroups 使用 length 以确保 push/splice 触发
  void tds.onlineGroups.length
  // 确保能检测到 dataByGroup 的深层变化
  for (const g of tds.groups) {
    const d = tds.dataByGroup[String(g)]
    if (d) {
      void d.stars.a1
      void d.stars.a2
      void d.stars.a3
      void d.stars.total
    }
  }
  // 使用 nextTick 确保 DOM 更新完成后再渲染图表
  nextTick(() => {
    render()
  })
})
</script>

<style scoped>
.dashboard {
  min-height: calc(100vh - 140px);
  padding: 1.5rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%);
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

.header-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
}

.dashboard-icon {
  font-size: 32px;
  color: #3b82f6;
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.subtitle {
  color: #6b7280;
  font-size: 14px;
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: #f0f9ff;
  border-radius: 20px;
  border: 1px solid #bfdbfe;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fafafa 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 40px;
  padding: 0.5rem;
  border-radius: 10px;
}

.stat-icon.groups {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.stat-icon.online {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 0.25rem;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.legend {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-dot.a1 { background: #3b82f6; }
.legend-dot.a2 { background: #8b5cf6; }
.legend-dot.a3 { background: #10b981; }

.legend-text {
  color: #4b5563;
  font-size: 13px;
  font-weight: 500;
}

.chart {
  width: 100%;
  height: 450px;
  min-height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }
  
  .stats-row {
    grid-template-columns: 1fr;
    max-width: 100%;
  }
  
  .chart {
    height: 350px;
    min-height: 300px;
  }
  
  .legend {
    flex-wrap: wrap;
    gap: 1rem;
  }
}
</style>
