/** Jira's built-in filters, as JQL this app's search engine understands. */
export interface DefaultFilter {
  id: string;
  name: string;
  jql: string;
}

export function issueSearchHref(jql: string): string {
  return `/issues?jql=${encodeURIComponent(jql)}`;
}

export function savedFilterHref(filterId: number): string {
  return `/issues?filter=${filterId}`;
}

export const ASSIGNED_TO_ME_JQL = 'assignee = currentUser() AND resolution is EMPTY ORDER BY updated DESC';

/** "Viewed recently" needs the keys of recently opened work items; it is left out when there are none. */
export function defaultFilters(recentIssueKeys: string[]): DefaultFilter[] {
  const filters: DefaultFilter[] = [
    { id: 'my-open', name: 'My open work items', jql: ASSIGNED_TO_ME_JQL },
    { id: 'reported', name: 'Reported by me', jql: 'reporter = currentUser() ORDER BY created DESC' },
    { id: 'all', name: 'All work items', jql: 'ORDER BY created DESC' },
    { id: 'open', name: 'Open work items', jql: 'resolution is EMPTY ORDER BY updated DESC' },
    { id: 'done', name: 'Done work items', jql: 'resolution is not EMPTY ORDER BY updated DESC' }
  ];
  if (recentIssueKeys.length > 0) {
    filters.push({ id: 'viewed', name: 'Viewed recently', jql: `key in (${recentIssueKeys.join(', ')})` });
  }
  filters.push(
    { id: 'created', name: 'Created recently', jql: 'ORDER BY created DESC' },
    { id: 'updated', name: 'Updated recently', jql: 'ORDER BY updated DESC' }
  );
  return filters;
}
