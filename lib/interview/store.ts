import { FinalInterviewReport, InterviewSession } from './types';

// Global in-memory session store
const globalStore = global as unknown as {
  activeSessionsStore?: Map<string, InterviewSession>;
  interviewReportsStore?: Map<string, FinalInterviewReport>;
};

if (!globalStore.activeSessionsStore) {
  globalStore.activeSessionsStore = new Map<string, InterviewSession>();
}

export const activeSessions = globalStore.activeSessionsStore;
if (!globalStore.interviewReportsStore) {
  globalStore.interviewReportsStore = new Map<string, FinalInterviewReport>();
}
export const interviewReports = globalStore.interviewReportsStore;
