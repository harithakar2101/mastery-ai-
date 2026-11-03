import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  size?: 'sm' | 'md';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1 && !tabs[targetIndex].disabled) {
      e.preventDefault();
      onChange(tabs[targetIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`flex items-center gap-1 overflow-x-auto ${
        variant === 'underline' ? 'border-b border-[#1c2c44]' : 'bg-[#0a111e] p-1 rounded-lg border border-[#1b2b41]'
      }`}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`flex items-center gap-2 whitespace-nowrap transition-colors font-medium cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
            } ${
              variant === 'underline'
                ? isActive
                  ? 'border-b-2 border-blue-500 text-blue-400 font-bold -mb-[1px]'
                  : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
                : isActive
                ? 'bg-blue-600 text-white font-bold rounded-md shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#132034] rounded-md'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
