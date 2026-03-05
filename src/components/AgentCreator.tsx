import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { characters } from '../../data/characters';
import { toast } from 'react-toastify';
import { ServerGame } from '../hooks/serverGame';
import ReactModal from 'react-modal';

const characterOptions = characters.map((c) => c.name);

export default function AgentCreator({
  worldId,
  game,
}: {
  worldId: Id<'worlds'>;
  game: ServerGame;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [character, setCharacter] = useState(characterOptions[0]);
  const [identity, setIdentity] = useState('');
  const [plan, setPlan] = useState('');

  const createAgent = useMutation(api.world.createAgent);
  const removeAgentMutation = useMutation(api.world.removeAgent);

  const agents = [...game.world.agents.values()];
  const playerDescriptions = game.playerDescriptions;
  const agentDescriptions = game.agentDescriptions;

  const handleCreate = async () => {
    if (!name.trim() || !identity.trim() || !plan.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await createAgent({
        worldId,
        name: name.trim(),
        character,
        identity: identity.trim(),
        plan: plan.trim(),
      });
      toast.success(`Agent "${name}" created!`);
      setName('');
      setIdentity('');
      setPlan('');
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create agent');
    }
  };

  const handleRemove = async (agentId: string) => {
    const desc = [...playerDescriptions.values()].find((d) => {
      const agent = agents.find((a) => a.id === agentId);
      return agent && d.playerId === agent.playerId;
    });
    const agentName = desc?.name || agentId;
    if (!confirm(`Remove agent "${agentName}"?`)) return;
    try {
      await removeAgentMutation({ worldId, agentId });
      toast.success(`Agent "${agentName}" removed`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove agent');
    }
  };

  return (
    <>
      <button
        className="button text-white shadow-solid text-xl pointer-events-auto"
        onClick={() => setModalOpen(true)}
      >
        <div className="inline-block bg-clay-700">
          <span>
            <div className="inline-flex h-full items-center gap-4 px-2">
              Agents
            </div>
          </span>
        </div>
      </button>

      <ReactModal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        style={modalStyles}
        contentLabel="Agent Manager"
        ariaHideApp={false}
      >
        <div className="font-body">
          <h1 className="text-center text-4xl font-bold font-display game-title mb-4">
            Manage Agents
          </h1>

          {/* Current agents list */}
          <div className="mb-6">
            <h2 className="text-2xl mb-2">Active Agents ({agents.length})</h2>
            {agents.length === 0 && (
              <p className="text-gray-400 text-sm">No agents in the world</p>
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
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create new agent form */}
          <h2 className="text-2xl mb-2">Create New Agent</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded"
                placeholder="e.g. Alex"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Character Sprite</label>
              <select
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded"
              >
                {characterOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Identity</label>
              <textarea
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded h-24"
                placeholder="Describe who this agent is, their personality, background..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Plan</label>
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full p-2 bg-brown-900 text-white border border-brown-700 rounded h-16"
                placeholder="What does this agent want to do? e.g. 'You want to make friends.'"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                className="button text-white shadow-solid text-lg pointer-events-auto"
              >
                <div className="inline-block bg-clay-700 px-4 py-1">Create Agent</div>
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="button text-white shadow-solid text-lg pointer-events-auto"
              >
                <div className="inline-block bg-brown-700 px-4 py-1">Close</div>
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
