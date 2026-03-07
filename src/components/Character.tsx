import { BaseTexture, ISpritesheetData, Spritesheet } from 'pixi.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedSprite, Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';

export const Character = ({
  textureUrl,
  spritesheetData,
  x,
  y,
  orientation,
  isMoving = false,
  isThinking = false,
  isSpeaking = false,
  isDancing = false,
  danceSpeed = 0.25,
  emoji = '',
  isViewer = false,
  speed = 0.1,
  onClick,
}: {
  // Path to the texture packed image.
  textureUrl: string;
  // The data for the spritesheet.
  spritesheetData: ISpritesheetData;
  // The pose of the NPC.
  x: number;
  y: number;
  orientation: number;
  isMoving?: boolean;
  // Shows a thought bubble if true.
  isThinking?: boolean;
  // Shows a speech bubble if true.
  isSpeaking?: boolean;
  // Dance animation.
  isDancing?: boolean;
  // Dance animation speed (cocaine = fast, mushroom = slow).
  danceSpeed?: number;
  emoji?: string;
  // Highlights the player.
  isViewer?: boolean;
  // The speed of the animation. Can be tuned depending on the side and speed of the NPC.
  speed?: number;
  onClick: () => void;
}) => {
  const [spriteSheet, setSpriteSheet] = useState<Spritesheet>();
  useEffect(() => {
    const parseSheet = async () => {
      const sheet = new Spritesheet(
        BaseTexture.from(textureUrl, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
        }),
        spritesheetData,
      );
      await sheet.parse();
      setSpriteSheet(sheet);
    };
    void parseSheet();
  }, []);

  // The first "left" is "right" but reflected.
  const roundedOrientation = Math.floor(orientation / 90);
  const direction = ['right', 'down', 'left', 'up'][roundedOrientation];

  // Dance animation: cycle through all directions rapidly
  const [danceFrame, setDanceFrame] = useState(0);
  const [danceBounce, setDanceBounce] = useState(0);
  useEffect(() => {
    if (!isDancing) return;
    let frame = 0;
    const ticker = PIXI.Ticker.shared;
    // Scale frame increment by danceSpeed (0.25 = normal, 0.5 = fast cocaine, 0.12 = slow shroom)
    const speedFactor = danceSpeed / 0.25;
    const update = () => {
      frame += speedFactor;
      // Switch direction every ~8 frames
      setDanceFrame(Math.floor(frame / 8) % 4);
      // Bounce up and down
      setDanceBounce(Math.abs(Math.sin(frame * 0.15)) * -6);
    };
    ticker.add(update);
    return () => { ticker.remove(update); };
  }, [isDancing, danceSpeed]);

  const danceDirections = ['down', 'left', 'right', 'down'];
  const activeDirection = isDancing ? danceDirections[danceFrame] : direction;

  // Prevents the animation from stopping when the texture changes
  // (see https://github.com/pixijs/pixi-react/issues/359)
  const ref = useRef<PIXI.AnimatedSprite | null>(null);
  useEffect(() => {
    if (isMoving || isDancing) {
      ref.current?.play();
    }
  }, [activeDirection, isMoving, isDancing]);

  if (!spriteSheet) return null;

  return (
    <Container x={x} y={y + (isDancing ? danceBounce : 0)} interactive={true} pointerdown={onClick} cursor="pointer">
      {isThinking && <FloatingEmoji emoji="💭" offsetX={-20} />}
      {isSpeaking && <FloatingEmoji emoji="💬" offsetX={18} />}
      {isViewer && <ViewerIndicator />}
      <AnimatedSprite
        ref={ref}
        isPlaying={isMoving || isDancing}
        textures={spriteSheet.animations[activeDirection]}
        animationSpeed={isDancing ? danceSpeed : speed}
        anchor={{ x: 0.5, y: 0.5 }}
      />
      {emoji && <FloatingEmoji emoji={emoji} offsetX={0} offsetY={-28} pulse />}
    </Container>
  );
};

function FloatingEmoji({
  emoji,
  offsetX = 0,
  offsetY = -10,
  pulse = false,
}: {
  emoji: string;
  offsetX?: number;
  offsetY?: number;
  pulse?: boolean;
}) {
  const [bounce, setBounce] = useState(0);

  useEffect(() => {
    if (!pulse) return;
    let frame = 0;
    const ticker = PIXI.Ticker.shared;
    const update = () => {
      frame++;
      setBounce(Math.sin(frame * 0.08) * 4);
    };
    ticker.add(update);
    return () => { ticker.remove(update); };
  }, [pulse]);

  return (
    <Text
      x={offsetX}
      y={offsetY + (pulse ? bounce : 0)}
      scale={pulse ? { x: -0.9, y: 0.9 } : { x: -0.8, y: 0.8 }}
      text={emoji}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  );
}

function ViewerIndicator() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    // Neon pink glow indicator
    g.beginFill(0xff2d95, 0.4);
    g.drawRoundedRect(-10, 10, 20, 6, 100);
    g.endFill();
    g.beginFill(0xff2d95, 0.2);
    g.drawRoundedRect(-14, 9, 28, 8, 100);
    g.endFill();
  }, []);

  return <Graphics draw={draw} />;
}
