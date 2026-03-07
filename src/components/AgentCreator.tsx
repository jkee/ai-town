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

  const removeAgentMutation = useMutation(api.world.removeAgent);

  if (!worldId || !game) {
    return null;
  }

  const agents = [...game.world.agents.values()];
  const playerDescriptions = game.playerDescriptions;

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

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="button text-white shadow-solid text-lg pointer-events-auto"
            >
              <div className="inline-block bg-brown-700 px-4 py-1">Закрыть</div>
            </button>
          </div>
        </div>
      </ReactModal>
    </>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(5, 5, 16, 0.85)',
    zIndex: 12,
    backdropFilter: 'blur(4px)',
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
    border: '2px solid #b026ff',
    borderRadius: '4px',
    background: 'linear-gradient(135deg, rgba(10, 10, 26, 0.97), rgba(25, 15, 40, 0.97))',
    color: 'white',
    fontFamily: '"Upheaval Pro", "sans-serif"',
    boxShadow: '0 0 30px rgba(176, 38, 255, 0.3), 0 0 60px rgba(255, 45, 149, 0.1)',
  },
};
