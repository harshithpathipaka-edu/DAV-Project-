import {
  Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const tooltipStyle = { border: "1px solid #d0d7de", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(31,35,40,.08)" };

function CommitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-md border border-[#d0d7de] bg-white px-3 py-2"><p className="text-xs text-[#656d76]">{label}</p><p className="mt-1 font-mono text-sm font-semibold">{payload[0].value} commits</p></div>;
}

export default function Charts({ type, data, repositories = [] }) {
  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#eaeef2" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#656d76" }} />
          {repositories.map((repository) => <Radar key={repository.full_name} name={repository.full_name} dataKey={repository.full_name} stroke={repository.color} fill={repository.color} fillOpacity={0.12} />)}
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "commits") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs><linearGradient id="commits-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0969da" stopOpacity={0.2} /><stop offset="100%" stopColor="#0969da" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#eaeef2" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8c959f" }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8c959f" }} allowDecimals={false} />
          <Tooltip content={<CommitTooltip />} />
          <Area type="monotone" dataKey="commits" stroke="#0969da" strokeWidth={2} fill="url(#commits-fill)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "issues") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eaeef2" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8c959f" }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8c959f" }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line name="Opened" type="monotone" dataKey="opened" stroke="#bf8700" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line name="Closed" type="monotone" dataKey="closed" stroke="#1a7f37" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "languages") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
            {data.map((language) => <Cell key={language.name} fill={language.color} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value}%`, name]} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
