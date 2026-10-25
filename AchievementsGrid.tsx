import { Cloud, Feather, Globe, Lock, Mountain, MountainSnow, PlaneLanding, Rocket, Route, Sunset, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, type AchievementDef } from '../../simulation/achievements';

const ICONS: Record<AchievementDef['icon'], typeof Rocket> = {
  Rocket, PlaneLanding, Mountain, Cloud, MountainSnow, Sunset, Trophy, Globe, Feather, Route,
};

export function AchievementIcon({ def, unlocked }: { def: AchievementDef; unlocked: boolean }) {
  const Icon = unlocked ? ICONS[def.icon] : Lock;
  return <Icon size={22} aria-hidden />;
}

export function AchievementsGrid({ unlocked }: { unlocked: Record<string, string> }) {
  return (
    <ul className="achievement-grid">
      {ACHIEVEMENTS.map((a) => {
        const at = unlocked[a.id];
        return (
          <li key={a.id} className={`achievement ${at ? 'is-unlocked' : ''}`}>
            <span className="achievement__icon"><AchievementIcon def={a} unlocked={!!at} /></span>
            <div>
              <strong>{a.name}</strong>
              <p>{a.description}</p>
              <small>{at ? `Unlocked ${new Date(at).toLocaleDateString()}` : `Locked · ${a.condition}`}</small>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
