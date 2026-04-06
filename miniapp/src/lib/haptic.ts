interface MAXBridge {
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
    selectionChanged: () => void;
  };
}

const bridge = (window as any).WebApp as MAXBridge | undefined;

export const haptic = {
  light: () => bridge?.HapticFeedback?.impactOccurred('light'),
  medium: () => bridge?.HapticFeedback?.impactOccurred('medium'),
  heavy: () => bridge?.HapticFeedback?.impactOccurred('heavy'),
  success: () => bridge?.HapticFeedback?.notificationOccurred('success'),
  warning: () => bridge?.HapticFeedback?.notificationOccurred('warning'),
  error: () => bridge?.HapticFeedback?.notificationOccurred('error'),
  selection: () => bridge?.HapticFeedback?.selectionChanged(),

  // Composite patterns
  foodAdded: () => { bridge?.HapticFeedback?.notificationOccurred('success'); },
  foodDeleted: () => { bridge?.HapticFeedback?.notificationOccurred('warning'); },
  waterAdded: () => { bridge?.HapticFeedback?.impactOccurred('light'); },
  tabSwitch: () => { bridge?.HapticFeedback?.selectionChanged(); },
  errorFeedback: () => { bridge?.HapticFeedback?.notificationOccurred('error'); },
  achievement: () => {
    bridge?.HapticFeedback?.notificationOccurred('success');
    setTimeout(() => bridge?.HapticFeedback?.impactOccurred('heavy'), 200);
  },
};
