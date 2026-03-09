import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
import MusicButton from './components/buttons/MusicButton.tsx';

import AgentCreator from './components/AgentCreator.tsx';
import AddAgentButton from './components/buttons/AddAgentButton.tsx';
import DrugButtons from './components/buttons/DrugButtons.tsx';

export default function Home() {
  return (
    <main className="relative flex h-[100dvh] flex-col font-body game-background overflow-hidden">
      <div className="w-full h-full relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start z-10">
        <h1 className="hidden sm:block mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          БЛЯДСКИЙ ЦИРК
        </h1>

        <div className="hidden sm:block max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl leading-tight">
          <span className="neon-text-pink">Виртуальный цирк</span>
          <span className="text-white opacity-60">, где AI-артисты живут, трындят и вытворяют хуйню.</span>
        </div>

        <Game />

        <footer className="fixed sm:relative bottom-0 left-0 w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-6 sm:mt-4 flex-wrap pointer-events-none z-20 safe-area-bottom">
          <div className="flex gap-2 sm:gap-4 flex-grow pointer-events-none flex-wrap">
            <MusicButton />
            <AgentCreator />
            <AddAgentButton />
            <DrugButtons />
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}
