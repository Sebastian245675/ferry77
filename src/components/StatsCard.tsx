
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'purple';
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-500 bg-blue-50',
    green: 'bg-green-500 text-green-500 bg-green-50',
    orange: 'bg-orange-500 text-orange-500 bg-orange-50',
    purple: 'bg-purple-500 text-purple-500 bg-purple-50',
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1">+{trend}% vs mes anterior</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color].split(' ')[2]}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[1]}`} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
