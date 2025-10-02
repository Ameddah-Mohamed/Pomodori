
import Background from "./components/Background.tsx"
import Timer from "./components/Timer.tsx"
import ControlDock from "./components/ControlDock.tsx"

function App() {


  return (
    <>
      <Background src="/images/wallpapers/back-1.webp" fadeDuration={800} />
      <ControlDock/>
    </>
  )
}

export default App
