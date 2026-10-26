import React from 'react';

export interface LiveRegionProps {
  message: string;
  /** 'polite' for status updates, 'assertive' for errors/warnings */
  politeness?: 'polite' | 'assertive';
  /** Clear message after this many milliseconds (0 = never clear) */
  clearAfter?: number;
}

/**
 * LiveRegion component for announcing dynamic content changes to screen readers.
 * Use for: loading states, form validation, toast notifications, AI generation updates.
 * 
 * WCAG 4.1.3 Status Messages: Announcements must be communicated to assistive technologies
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  politeness = 'polite',
  clearAfter = 0
}) => {
  const [displayMessage, setDisplayMessage] = React.useState(message);

  React.useEffect(() => {
    setDisplayMessage(message);
    
    if (clearAfter > 0 && message) {
      const timer = setTimeout(() => {
        setDisplayMessage('');
      }, clearAfter);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, clearAfter]);

  if (!displayMessage) return null;

  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {displayMessage}
    </div>
  );
};

/**
 * Hook for managing live region announcements
 */
export const useLiveRegion = () => {
  const [announcement, setAnnouncement] = React.useState('');
  const [politeness, setPoliteness] = React.useState<'polite' | 'assertive'>('polite');

  const announce = React.useCallback((message: string, assertive = false) => {
    setPoliteness(assertive ? 'assertive' : 'polite');
    setAnnouncement(message);
  }, []);

  const clearAnnouncement = React.useCallback(() => {
    setAnnouncement('');
  }, []);

  return { announcement, politeness, announce, clearAnnouncement };
};
