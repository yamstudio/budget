import type { Chart, ChartDataset } from 'chart.js'
import { Colors as DefaultColors, DoughnutController, PolarAreaController } from 'chart.js'
import { ColorsPluginOptions } from 'chart.js/dist/plugins/plugin.colors'

const BORDER_COLORS = [
  'rgb(250, 211, 144)',
  'rgb(229, 80, 57)',
  'rgb(30, 55, 153)',
  'rgb(10, 61, 98)',
  'rgb(12, 36, 97)',
  'rgb(235, 47, 6)',
  'rgb(246, 185, 59)',
  'rgb(248, 194, 145)',
  'rgb(74, 105, 189)',
  'rgb(60, 99, 130)',
  'rgb(7, 153, 146)',
  'rgb(56, 173, 169)',
  'rgb(96, 163, 188)',
  'rgb(106, 137, 204)',
  'rgb(183, 21, 64)',
  'rgb(250, 152, 58)',
  'rgb(130, 204, 221)',
  'rgb(120, 224, 143)',
  'rgb(229, 142, 38)',
  'rgb(184, 233, 148)',
]

const BACKGROUND_COLORS = BORDER_COLORS.map((color) => color.replace('rgb(', 'rgba(').replace(')', ', 0.86)'))

const getBorderColor = (i: number): string => BORDER_COLORS[i % BORDER_COLORS.length]
const getBackgroundColor = (i: number): string => BACKGROUND_COLORS[i % BACKGROUND_COLORS.length]
const colorizeDefaultDataset = (dataset: ChartDataset, i: number): void => {
  dataset.borderColor = getBorderColor(i)
  dataset.backgroundColor = getBackgroundColor(i)
}
const colorizeDoughnutDataset = (dataset: ChartDataset, i: number): void => {
  dataset.backgroundColor = dataset.data.map(() => getBorderColor(i))
}
const colorizePolarAreaDataset = (dataset: ChartDataset, i: number): void => {
  dataset.backgroundColor = dataset.data.map(() => getBackgroundColor(i))
}
const getColorizer = (chart: Chart): ((dataset: ChartDataset, datasetIndex: number) => void) => {
  let i = 0
  return (dataset: ChartDataset, datasetIndex: number) => {
    const controller = chart.getDatasetMeta(datasetIndex).controller
    if (controller instanceof DoughnutController) {
      colorizeDoughnutDataset(dataset, i)
    } else if (controller instanceof PolarAreaController) {
      colorizePolarAreaDataset(dataset, i)
    } else if (controller) {
      colorizeDefaultDataset(dataset, i)
    }
    ++i
  }
}

/**
 * {@link https://karlynelson.com/posts/chartjs-custom-color-palette-responsive/ How to add your own custom color palette to Chart JS}
 */
const customChartColors = {
  id: 'customChartColors',
  defaults: {
    enabled: true,
  },
  beforeLayout: (chart: Chart, _args: unknown, options: ColorsPluginOptions) => {
    if (!options.enabled) {
      return
    }
    const {
      data: { datasets },
    } = chart.config
    const colorizer = getColorizer(chart)
    datasets.forEach(colorizer)
  },
} satisfies typeof DefaultColors

export default customChartColors
