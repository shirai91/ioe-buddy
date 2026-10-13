import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Credits from './screens/Credits.jsx'
import FillIn from './screens/FillIn.jsx'
import FlashCards from './screens/FlashCards.jsx'
import Home from './screens/Home.jsx'
import LetterPop from './screens/LetterPop.jsx'
import MatchUp from './screens/MatchUp.jsx'
import PicturePick from './screens/PicturePick.jsx'
import Practice from './screens/Practice.jsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cards" element={<FlashCards />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/practice/picture-pick" element={<PicturePick />} />
      <Route path="/practice/letter-pop" element={<LetterPop />} />
      <Route path="/practice/match-up" element={<MatchUp />} />
      <Route path="/practice/fill-in" element={<FillIn />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
