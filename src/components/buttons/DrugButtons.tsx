import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'react-toastify';

const DRUG_CONFIG = {
  cocaine: { emoji: '💊', color: '#ff4444' },
  mdma: { emoji: '💗', color: '#ff69b4' },
  mushroom: { emoji: '🍄', color: '#9b59b6' },
} as const;

const DRUG_TOAST: Record<string, string[]> = {
  cocaine: [
    'закинулся! Сейчас понесётся...',
    'нюхнул дорожку! Держитесь!',
    'будет говорить без остановки!',
  ],
  mdma: [
    'закинулся! Всех любит!',
    'обнимашки!',
    'мир прекрасен!',
  ],
  mushroom: [
    'видит фракталы!',
    'разговаривает с деревьями!',
    'лежит и смотрит на звёзды!',
  ],
};

type DrugType = 'cocaine' | 'mdma' | 'mushroom';

export default function DrugButtons() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const drop = useMutation(api.world.dropDrug);
  const handleDrop = async (drugType: DrugType) => {
    if (!worldId) return;
    try {
      const result = await drop({ worldId, drugType });
      const name = result?.agentName || 'Кто-то';
      const toasts = DRUG_TOAST[drugType];
      const msg = toasts[Math.floor(Math.random() * toasts.length)];
      toast.success(`${name} ${msg}`, { icon: DRUG_CONFIG[drugType].emoji });
    } catch (e: any) {
      toast.error(e.message || 'Не получилось');
    }
  };

  return (
    <div className="flex gap-2 pointer-events-auto">
      {(Object.keys(DRUG_CONFIG) as DrugType[]).map((type) => {
        const cfg = DRUG_CONFIG[type];
        return (
          <button
            key={type}
            onClick={() => handleDrop(type)}
            className="button text-white shadow-solid text-xl"
          >
            <div
              className="inline-block px-2 py-1"
              style={{
                background: `linear-gradient(135deg, rgba(10,10,26,0.9), ${cfg.color}40)`,
                border: `1px solid ${cfg.color}`,
                boxShadow: `0 0 10px ${cfg.color}40`,
              }}
            >
              <span className="text-lg sm:text-xl">{cfg.emoji}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
