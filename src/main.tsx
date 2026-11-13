import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/bodoni-moda/opsz.css'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import './styles/global.css'
import './styles/sections.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
