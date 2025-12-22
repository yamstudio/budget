import eslint from '@eslint/js'
import eslintReact from '@eslint-react/eslint-plugin'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, eslintReact.configs['recommended-typescript'])
