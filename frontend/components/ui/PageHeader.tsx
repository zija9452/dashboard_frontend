'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <h1 className="text-2xl font-medium text-center mb-2">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-600 text-center">{subtitle}</p>
      )}
    </div>
  );
};

export default PageHeader;
