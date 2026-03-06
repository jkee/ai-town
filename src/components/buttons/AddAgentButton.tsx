import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import Button from './Button';
import starImg from '../../../assets/star.svg';

export default function AddAgentButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const generate = useMutation(api.world.generateAndCreateAgent);

  const handleGenerate = async () => {
    if (!worldId || !prompt.trim()) {
      toast.error('Опиши кого хочешь добавить!');
      return;
    }
    setLoading(true);
    try {
      await generate({ worldId, prompt: prompt.trim() });
      toast.success('Генерируем артиста... Скоро появится на арене!');
      setPrompt('');
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Не получилось');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button imgUrl={starImg} onClick={() => setModalOpen(true)}>
        Новый артист
      </Button>

      <ReactModal
        isOpen={modalOpen}
        onRequestClose={() => !loading && setModalOpen(false)}
        style={modalStyles}
        contentLabel="Добавить артиста"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-4xl font-bold font-display game-title mb-4">
            Добавить артиста
          </h1>
          <p className="text-sm text-gray-300 mb-4">
            Опиши кого хочешь запустить на арену. ИИ сгенерирует персонажа с уникальным спрайтом.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 bg-brown-900 text-white border border-brown-700 rounded h-28 text-lg"
            placeholder="напр. пьяный медведь на моноцикле, который рассказывает анекдоты"
            disabled={loading}
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="button text-white shadow-solid text-lg pointer-events-auto"
            >
              <div className={`inline-block bg-clay-700 px-4 py-1 ${loading ? 'opacity-50' : ''}`}>
                {loading ? 'Генерируем...' : 'Запустить на арену'}
              </div>
            </button>
            <button
              onClick={() => setModalOpen(false)}
              disabled={loading}
              className="button text-white shadow-solid text-lg pointer-events-auto"
            >
              <div className="inline-block bg-brown-700 px-4 py-1">Отмена</div>
            </button>
          </div>
        </div>
      </ReactModal>
    </>
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
    maxWidth: '500px',
    width: '90%',
    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};
