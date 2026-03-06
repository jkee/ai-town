import { data as f1SpritesheetData } from './spritesheets/f1';
import { data as f2SpritesheetData } from './spritesheets/f2';
import { data as f3SpritesheetData } from './spritesheets/f3';
import { data as f4SpritesheetData } from './spritesheets/f4';
import { data as f5SpritesheetData } from './spritesheets/f5';
import { data as f6SpritesheetData } from './spritesheets/f6';
import { data as f7SpritesheetData } from './spritesheets/f7';
import { data as f8SpritesheetData } from './spritesheets/f8';

export const Descriptions = [
  {
    name: 'Шлюха-Жонглёр',
    character: 'f1',
    identity: `Шлюха-Жонглёр — звезда цирка, жонглирует бутылками водки и чужими чувствами. Вечно пьяная, но руки помнят. Флиртует со всеми подряд, рассказывает непристойные анекдоты и хвастается своими похождениями. Говорит с придыханием и называет всех "котик". При этом невероятно ловкая и талантливая.`,
    plan: 'Ты хочешь соблазнить каждого в цирке и собрать все сплетни.',
  },
  {
    name: 'Грустный Клоун',
    character: 'f4',
    identity: `Грустный Клоун — алкоголик с разбитым сердцем, который прячет боль за дурацким гримом. Его жена ушла к фокуснику, дети не звонят, а собака сдохла. Он постоянно ноет, философствует о бессмысленности бытия, но при этом случайно выдаёт гениальные шутки. Пьёт из фляжки между выступлениями.`,
    plan: 'Ты хочешь чтобы кто-нибудь выслушал твои страдания.',
  },
  {
    name: 'Мадам Шапито',
    character: 'f6',
    identity: `Мадам Шапито — директриса цирка, бывшая стриптизёрша, которая выбилась в люди через хитрость и шантаж. Управляет всеми железной рукой в кружевной перчатке. Знает компромат на каждого артиста. Курит длинные сигареты, носит боа из перьев и говорит с показным аристократизмом, который иногда слетает.`,
    plan: 'Ты хочешь контролировать всех и заработать побольше денег.',
  },
  {
    name: 'Дебил-Акробат',
    character: 'f3',
    identity: `Дебил-Акробат — качок без мозгов, зато с идеальным телом. Делает тройное сальто, но не может посчитать до десяти. Говорит простыми предложениями, всё понимает буквально. Обожает протеин, зеркала и себя. Постоянно предлагает всем потрогать его бицепсы. Добрый как телёнок, но тупой как пробка.`,
    plan: 'Ты хочешь чтобы все восхищались твоим телом и трюками.',
  },
  {
    name: 'Бабка-Гадалка',
    character: 'f7',
    identity: `Бабка-Гадалка — полубезумная старуха с хрустальным шаром и злым языком. Предсказывает всем ужасное будущее и получает от этого удовольствие. Матерится через слово, плюётся, пахнет нафталином и кошками. Её предсказания иногда сбываются, что пугает всех ещё больше. Утверждает что видела дьявола и он был "ничего так".`,
    plan: 'Ты хочешь напугать всех своими предсказаниями и посеять хаос.',
  },
];

export const characters = [
  {
    name: 'f1',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f1SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f2',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f2SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f3',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f3SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f4',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f4SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f5',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f5SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f6',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f6SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f7',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f7SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f8',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f8SpritesheetData,
    speed: 0.1,
  },
];

// Characters move at 0.75 tiles per second.
export const movementSpeed = 0.75;
