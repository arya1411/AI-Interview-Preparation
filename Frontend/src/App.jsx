import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/Auth/Login'
import SignupPage from './pages/Auth/Signup'
import HomeDashboard from './pages/Home/HomeDashboard'
import SessionDetail from './pages/User/SessionDetail'

import EditProfile from './pages/EditProfile'
import PrivateRoute from './routes/PrivateRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<HomeDashboard />} />
        <Route path="/session/:id" element={<SessionDetail />} />

        <Route path="/profile/edit" element={<EditProfile />} />
      </Route>
    </Routes>
  )
}

export default App
