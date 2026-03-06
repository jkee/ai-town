import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
import MusicButton from './components/buttons/MusicButton.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import AgentCreator from './components/AgentCreator.tsx';
import AddAgentButton from './components/buttons/AddAgentButton.tsx';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">
      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start z-10">
        <h1 className="mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          БЛЯДСКИЙ ЦИРК
        </h1>

        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl leading-tight">
          <span className="neon-text-pink">Виртуальный цирк</span>
          <span className="text-white opacity-60">, где AI-артисты живут, трындят и вытворяют хуйню.</span>
        </div>

        <Game />

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <MusicButton />
            <InteractButton />
            <AgentCreator />
            <AddAgentButton />
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}
