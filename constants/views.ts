export const VIEW_NAMES = {
  DASHBOARD: 'dashboard',
  YEARLY_UTILIZATION: 'yearly-utilization',
  ANALYTICS: 'analytics',
  MEMBERS: 'members',
  PROJECTS: 'projects',
  PROJECT_DETAIL: 'project-detail',
  PROJECT_CREATION: 'project-creation',
  PROJECT_EDIT: 'project-edit',
  PROJECT_REVIEW: 'project-review',
  MEMBER_PROFILE: 'member-profile',
  MONTHLY_DETAILS: 'monthly-details',
} as const;

export type ViewName = typeof VIEW_NAMES[keyof typeof VIEW_NAMES];