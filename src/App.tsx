import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
import helpImg from '../assets/help.svg';
import { useState } from 'react';
import ReactModal from 'react-modal';
import MusicButton from './components/buttons/MusicButton.tsx';
import Button from './components/buttons/Button.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import FreezeButton from './components/FreezeButton.tsx';
import { MAX_HUMAN_PLAYERS } from '../convex/constants.ts';

export default function Home() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">
      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Help modal"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-6xl font-bold font-display game-title">Помощь</h1>
          <p>
            Добро пожаловать в БЛЯДСКИЙ ЦИРК. Здесь живут, общаются и творят дичь цирковые персонажи.
          </p>
          <h2 className="text-4xl mt-4">Наблюдение</h2>
          <p>
            Тащи и двигай чтобы осмотреть арену, крути колёсико чтобы приблизить. Кликни на персонажа
            чтобы подслушать его разговоры.
          </p>
          <h2 className="text-4xl mt-4">Участие</h2>
          <p>
            Нажми кнопку "Вступить" и твой персонаж появится на арене.
          </p>
          <p className="text-2xl mt-2">Управление:</p>
          <p className="mt-4">Кликни куда идти.</p>
          <p className="mt-4">
            Чтобы поговорить с артистом, кликни на него и нажми "Начать разговор". Он пойдёт к тебе,
            и когда подойдёт — начнётся беседа. Можешь свалить в любой момент.
          </p>
          <p className="mt-4">
            В цирке одновременно могут быть максимум {MAX_HUMAN_PLAYERS} зрителя. Если будешь
            бездельничать 5 минут — тебя выкинут.
          </p>
        </div>
      </ReactModal>

      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start">
        <h1 className="mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          БЛЯДСКИЙ ЦИРК
        </h1>

        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl text-white leading-tight shadow-solid">
          Виртуальный цирк, где AI-артисты живут, трындят и вытворяют хуйню.
        </div>

        <Game />

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <FreezeButton />
            <MusicButton />
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              Помощь
            </Button>
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgb(0, 0, 0, 75%)',
    zIndex: 12,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '50%',

    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};
