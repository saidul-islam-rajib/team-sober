export const STRINGS = {
  common: {
    save: 'Save',
    reset: 'Reset',
    search: 'Search',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    backToDashboard: '← Back to dashboard',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Profile, site identity and footer.',
    saved: 'Settings saved.',
    config: {
      heading: 'Platform configuration',
      lead: 'Operational limits, saved separately from your profile. Changes take effect immediately, with no redeploy.',
      searchTitle: 'Search',
      filterNameLabel: 'Name',
      filterValueLabel: 'Value',
      filterNamePlaceholder: 'Filter by setting name',
      filterValuePlaceholder: 'Filter by value',
      colName: 'Setting name',
      colGroup: 'Group',
      colValue: 'Value',
      colDefault: 'Default',
      rangePrefix: 'range',
      reset: 'Reset',
      empty: 'No settings match your search.',
      save: 'Save configuration',
    },
  },
} as const;

export type Strings = typeof STRINGS;
