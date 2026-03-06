import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'react-toastify';
import { useServerGame } from '../hooks/serverGame';
import ReactModal from 'react-modal';
import Button from './buttons/Button';
import starImg from '../../assets/star.svg';

export default function AgentCreator() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [plan, setPlan] = useState('');

  const createAgent = useMutation(api.world.createAgent);
  const removeAgentMutation = useMutation(api.world.removeAgent);

  if (!worldId || !game) {
    return null;
  }

  const agents = [...game.world.agents.values()];
  const playerDescriptions = game.playerDescriptions;
  const agentDescriptions = game.agentDescriptions;

  const handleCreate = async () => {
    if (!name.trim() || !identity.trim() || !plan.trim()) {
      toast.error('Заполни все поля, бестолочь');
      return;
    }
    try {
      await createAgent({
        worldId,
        name: name.trim(),
        character: 'generated',
        identity: identity.trim(),
        plan: plan.trim(),
      });
      toast.success(`"${name}" нанят в цирк!`);
      setName('');
      setIdentity('');
      setPlan('');
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Не удалось нанять');
    }
  };

  const handleRemove = async (agentId: string) => {
    const desc = [...playerDescriptions.values()].find((d) => {
      const agent = agents.find((a) => a.id === agentId);
      return agent && d.playerId === agent.playerId;
    });
    const agentName = desc?.name || agentId;
    if (!confirm(`Выгнать "${agentName}" из цирка?`)) return;
    try {
      await removeAgentMutation({ worldId, agentId });
      toast.success(`"${agentName}" выгнан из цирка`);
    } catch (e: any) {
      toast.error(e.message || 'Не удалось выгнать');
    }
  };

  return (
    <>
      <Button onClick={() => setModalOpen(true)} imgUrl={starImg}>
        Артисты
      </Button>

      <ReactModal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        style={modalStyles}
        contentLabel="Управление артистами"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-4xl font-bold font-display game-title mb-4">
            Управление артистами
          </h1>

          {/* Current agents list */}
          <div className="mb-6">
            <h2 className="text-2xl mb-2">На арене ({agents.length})</h2>
            {agents.length === 0 && (
              <p className="text-gray-400 text-sm">Арена пуста, все разбежались</p>
            )}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {agents.map((agent) => {
                const desc = playerDescriptions.get(agent.playerId);
                const agentDesc = agentDescriptions.get(agent.id);
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between bg-brown-900 p-2 rounded"
                  >
                    <div>
                      <span className="font-bold">{desc?.name || '?'}</span>
                      <span className="text-sm text-gray-300 ml-2">
                        ({desc?.character})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(agent.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                    >
                      Выгнать
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create new agent form */}
          <h2 className="text-2xl mb-2">Нанять нового артиста</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Погоняло</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded"
                placeholder="напр. Клоун-Алкаш"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Личность</label>
              <textarea
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded h-24"
                placeholder="Опиши кто это такой, его характер, повадки, странности..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Цель в жизни</label>
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded h-16"
                placeholder="Чего этот персонаж хочет? напр. 'Ты хочешь напиться и устроить скандал.'"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                className="button text-white shadow-solid text-lg pointer-events-auto"
              >
                <div className="inline-block bg-clay-700 px-4 py-1">Нанять</div>
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="button text-white shadow-solid text-lg pointer-events-auto"
              >
                <div className="inline-block bg-brown-700 px-4 py-1">Закрыть</div>
              </button>
            </div>
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
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto' as const,
    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
  },
};
