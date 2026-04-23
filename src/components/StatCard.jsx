export default function StatCard({ label, value, emoji, bgColor }) {
  return (
    <div className="flex-1 rounded-lg p-4 text-right" style={{ backgroundColor: bgColor }}>
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-xs text-gray-600 font-medium">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
