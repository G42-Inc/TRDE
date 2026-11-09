'use client';

import { useState, ReactNode } from 'react';
import { ChartBarIcon, PresentationChartLineIcon, BookmarkIcon } from '@heroicons/react/24/outline';

interface Tab {
  id: string;
  label: string;
  icon: any;
  content: ReactNode;
}

interface PerformanceHubTabsProps {
  analyticsContent: ReactNode;
  strategiesContent: ReactNode;
  glossaryContent?: ReactNode;
}

export function PerformanceHubTabs({
  analyticsContent,
  strategiesContent,
  glossaryContent,
}: PerformanceHubTabsProps) {
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs: Tab[] = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: ChartBarIcon,
      content: analyticsContent,
    },
    {
      id: 'strategies',
      label: 'Strategies',
      icon: PresentationChartLineIcon,
      content: strategiesContent,
    },
  ];

  if (glossaryContent) {
    tabs.push({
      id: 'glossary',
      label: 'Glossary',
      icon: BookmarkIcon,
      content: glossaryContent,
    });
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="container-premium">
      {/* Premium Header with Tabs */}
      <div className="animate-slide-in-down" style={{ marginBottom: 'var(--space-3xl)' }}>
        <h1 className="theme-text text-h1" style={{ marginBottom: 'var(--space-lg)' }}>
          Performance Hub
        </h1>

        {/* Tab Navigation */}
        <div className="flex items-center border-b" style={{ gap: 'var(--space-sm)', borderColor: 'var(--theme-border)' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                aria-pressed={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-3 text-sm sm:px-6 sm:py-4 sm:text-lg transition-all font-semibold border-b-2 ${
                  isActive
                    ? ''
                    : 'theme-text-secondary hover:theme-text'
                }`}
                style={{
                  borderColor: isActive ? 'var(--theme-primary)' : 'transparent',
                  color: isActive ? 'var(--theme-primary)' : undefined,
                  marginBottom: '-2px',
                  transitionDuration: 'var(--transition-base)',
                }}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTabData?.content}
      </div>
    </div>
  );
}
