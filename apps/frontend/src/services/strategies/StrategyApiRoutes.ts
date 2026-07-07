export const GET_STRATEGIES = "/strategies";
export const CREATE_STRATEGY = "/strategies";
export const GET_STRATEGY_BY_ID = (id: string) => `/strategies/${id}`;
export const UPDATE_STRATEGY = (id: string) => `/strategies/${id}`;
export const START_STRATEGY = (id: string) => `/strategies/${id}/start`;
export const STOP_STRATEGY = (id: string) => `/strategies/${id}/stop`;
export const STOP_EXIT_STRATEGY = (id: string) => `/strategies/${id}/stop-exit`;
export const RESET_STRATEGY = (id: string) => `/strategies/${id}/reset`;
export const DUPLICATE_STRATEGY = (id: string) => `/strategies/${id}/duplicate`;
export const GET_STRATEGY_LOGS = (id: string) => `/strategies/${id}/logs`;
export const GET_STRATEGY_RUNTIME_STATUS = (id: string) => `/strategies/${id}/runtime-status`;

