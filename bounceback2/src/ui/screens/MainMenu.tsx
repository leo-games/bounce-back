import { Button } from '../components/Button';

interface MainMenuProps {
  onPlay: () => void;
  onEditor: () => void;
}

export function MainMenu({ onPlay, onEditor }: MainMenuProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200 p-8">
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-indigo-600 mb-2">
            Bounce Back
          </h1>
          <p className="text-lg text-slate-600">
            Get the ball in the hole!
          </p>
        </div>

        {/* Animated ball preview */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-slate-200 shadow-lg animate-bounce" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full border-4 border-dashed border-indigo-300 animate-spin"
              style={{ animationDuration: '8s' }}
            />
          </div>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-4 w-full">
          <Button size="lg" onClick={onPlay}>
            Play Game
          </Button>
          <Button size="lg" variant="secondary" onClick={onEditor}>
            Level Editor
          </Button>
        </div>

        {/* Footer */}
        <p className="text-sm text-slate-500 mt-8">
          A Leo Games Production
        </p>
      </div>
    </div>
  );
}
