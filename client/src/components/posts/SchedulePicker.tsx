import { Calendar } from 'lucide-react';

interface SchedulePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Schedule (optional)
      </label>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Leave empty to save as draft
      </p>
    </div>
  );
}
