import { useCountdown } from '@/hooks/useCountdown';

export function CountdownTimer({ createdAt }: { createdAt: number | bigint | null }) {
  const { timeRemaining, isExpired, formattedTime } = useCountdown(createdAt);

  if (!createdAt) return null;

  return (
    <div className="flex items-center gap-3">
      <div className={`text-2xl font-mono font-bold ${
        isExpired ? 'text-red-600' :
        timeRemaining <= 10 ? 'text-orange-600 animate-pulse' :
        'text-gray-800'
      }`}>
        {formattedTime}
      </div>
      {isExpired && (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
          Time Expired
        </span>
      )}
    </div>
  );
}
