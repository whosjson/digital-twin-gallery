import { Routes, Route } from 'react-router'
import Lobby from './pages/Lobby'
import Home from './pages/Home'
import Info from './pages/Info'
import PrivateGallery from './pages/PrivateGallery'
import VirtualGallery from './pages/VirtualGallery'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/celebrities" element={<Home />} />
      <Route path="/info" element={<Info />} />
      <Route path="/private" element={<PrivateGallery />} />
      <Route path="/virtual" element={<VirtualGallery />} />
    </Routes>
  )
}
