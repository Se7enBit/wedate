import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import './index.css'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import App from './App.tsx'
import Create from './routes/Create.tsx'
import Discover from './routes/Discover.tsx'
import IdeaDetail from './routes/IdeaDetail.tsx'
import IdeaForm from './routes/IdeaForm.tsx'
import Now from './routes/Now.tsx'
import { NotFound, RouteError } from './routes/Problem.tsx'
import Saved from './routes/Saved.tsx'
import Settings from './routes/Settings.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      {
        // A crash in one screen keeps the header and tab bar around it.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Discover /> },
          { path: 'now', element: <Now /> },
          { path: 'create', element: <Create /> },
          { path: 'saved', element: <Saved /> },
          { path: 'settings', element: <Settings /> },
          { path: 'idea/new', element: <IdeaForm /> },
          { path: 'idea/:id', element: <IdeaDetail /> },
          { path: 'idea/:id/edit', element: <IdeaForm /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </StrictMode>,
)
