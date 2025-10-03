
import Background from "./components/Background.tsx"
import ControlDock from "./components/ControlDock.tsx"

function App() {


  return (
    <>
      <Background src="/images/wallpapers/back-1.webp" fadeDuration={800} />
      <ControlDock/>
      <div className="fixed bottom-4 w-full flex justify-center ">
        <p
          className="
            text-white text-center text-sm
            bg-white/10 backdrop-blur-md
            px-4 py-2 rounded-full
            border border-white/20
            shadow-lg
          "
        >
          Made with ❤️ by <span className="font-semibold">Ameddah Mohamed</span>
        </p>
      </div>
    </>
  )
}

export default App
