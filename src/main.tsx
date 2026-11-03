import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import App from './App.tsx'
import Create from './routes/Create.tsx'
import Discover from './routes/Discover.tsx'
import Now from './routes/Now.tsx'
import Saved from './routes/Saved.tsx'
import Settings from './routes/Settings.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Discover /> },
      { path: 'now', element: <Now /> },
      { path: 'create', element: <Create /> },
      { path: 'saved', element: <Saved /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
