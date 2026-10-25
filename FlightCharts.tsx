import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MISSIONS } from '../../simulation/missionEngine';
import { WORLDS } from '../../simulation/worldDefinitions';
import { useProgressStore } from '../../store/useProgressStore';

const TICK = { fill: '#c9d8e8', fontSize: 12 };
const TIP = { background: '#0b1f3a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#e8f3fb' };
const GRID = 'rgba(255,255,255,0.1)';
const RECENT = 12;

function Chart({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <figure className="chart-card">
      <figcaption>
        <h3>{title}</h3>
        <p>{desc}</p>
      </figcaption>
      <div className="chart-box">{children}</div>
    </figure>
  );
}

export function FlightCharts() {
  const history = useProgressStore((s) => s.history);
  const stats = useProgressStore((s) => s.stats);
  const completed = Object.keys(useProgressStore((s) => s.completed)).length;

  const recent = history.slice(-RECENT).map((f, i, arr) => ({
    n: `#${history.length - arr.length + i + 1}`,
    minutes: Math.round((f.duration / 60) * 10) / 10,
    altitude: Math.round(f.maxAltitude),
  }));
  const byWorld = WORLDS.map((w) => ({ name: w.name.replace(' ', '\n'), short: w.name, metres: Math.round(stats.distanceByWorld[w.id] ?? 0) }));
  const missionData = [
    { name: 'Completed', value: completed },
    { name: 'Remaining', value: MISSIONS.length - completed },
  ];

  return (
    <div className="chart-grid">
      <Chart title="Flight duration" desc={`Minutes in the air for your last ${Math.min(RECENT, history.length)} flights`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recent} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="n" tick={TICK} stroke={GRID} />
            <YAxis tick={TICK} stroke={GRID} unit=" min" width={58} />
            <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(255,255,255,0.06)' }} formatter={(v) => [`${v} min`, 'Duration']} />
            <Bar dataKey="minutes" fill="#5cc8ff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Altitude records" desc="Highest altitude reached on each recent flight">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={recent} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="n" tick={TICK} stroke={GRID} />
            <YAxis tick={TICK} stroke={GRID} unit=" m" width={58} />
            <Tooltip contentStyle={TIP} formatter={(v) => [`${v} m`, 'Max altitude']} />
            <Line type="monotone" dataKey="altitude" stroke="#ffc857" strokeWidth={3} dot={{ r: 4, fill: '#ffc857' }} />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Distance by environment" desc="Total metres flown in each world">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byWorld} margin={{ top: 8, right: 8, bottom: 8, left: -4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="short" tick={{ ...TICK, fontSize: 10 }} stroke={GRID} interval={0} angle={-25} textAnchor="end" height={64} />
            <YAxis tick={TICK} stroke={GRID} unit=" m" width={62} />
            <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(255,255,255,0.06)' }} formatter={(v) => [`${v} m`, 'Distance']} />
            <Bar dataKey="metres" fill="#ff8a3d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Mission completion" desc={`${completed} of ${MISSIONS.length} missions completed`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={missionData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={completed > 0 && completed < MISSIONS.length ? 3 : 0} stroke="none">
              <Cell fill="#5ee08a" />
              <Cell fill="rgba(255,255,255,0.18)" />
            </Pie>
            <Tooltip contentStyle={TIP} />
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-centre" aria-hidden>{completed}/{MISSIONS.length}</div>
      </Chart>
    </div>
  );
}
