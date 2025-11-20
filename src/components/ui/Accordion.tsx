import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  defaultExpanded = false,
  expanded,
  onToggle,
  className = '',
  headerClassName = '',
  contentClassName = '',
  icon,
  badge,
  badgeColor = 'gray'
}) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Используем внешнее состояние, если оно передано, иначе внутреннее
  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    
    if (expanded === undefined) {
      // Если не используется внешнее управление, обновляем внутреннее состояние
      setInternalExpanded(newExpanded);
    }
    
    // Вызываем callback, если он передан
    if (onToggle) {
      onToggle(newExpanded);
    }
  };

  const getBadgeColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800';
      case 'red':
        return 'bg-red-100 text-red-800';
      case 'gray':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${headerClassName}`}
      >
        <div className="flex items-center space-x-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColorClasses(badgeColor)}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className={`border-t border-gray-200 ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};
