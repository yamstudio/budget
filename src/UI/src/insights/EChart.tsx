import { useEffect, useRef } from 'react'
import { BarChart, SankeyChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([BarChart, SankeyChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface EChartProps {
  option: EChartsOption
  height: number
  /** Text alternative for screen readers. */
  label: string
}

/** Thin wrapper: one chart instance per mount, resized with its container, option replaced on change. */
const EChart = ({ option, height, label }: EChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const instance = echarts.init(containerRef.current!)
    chartRef.current = instance
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(containerRef.current!)
    return () => {
      observer.disconnect()
      instance.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={containerRef} role="img" aria-label={label} style={{ width: '100%', height }} />
}

export default EChart
