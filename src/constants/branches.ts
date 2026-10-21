/**
 * Degree / department options, grouped for display. The single source for the job posting form,
 * student profile and admin broadcast. The strings are the values stored in the database
 * (students.branch, job_postings.eligible_branches), so do not rename them.
 */
export const BRANCH_GROUPS = [
  { title: 'Undergraduate', items: ['BCA', 'BSc.IT', 'BSc.CS', 'CS-BS'] },
  { title: 'B.Tech / Engineering', items: ['CE', 'CSE', 'IT', 'EE', 'ECE', 'EEE', 'EIE', 'AI-DS', 'AIML'] },
  { title: 'Postgraduate', items: ['MCA', 'MSc.IT', 'MSc.CS'] },
] as const;

export const BRANCHES: readonly string[] = BRANCH_GROUPS.flatMap((g) => g.items);
