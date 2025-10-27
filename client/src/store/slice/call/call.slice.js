import { createSlice } from "@reduxjs/toolkit";
import { createCallLogThunk, fetchCallLogsThunk } from "./call.thunk";

const initialState = {
  logs: [],
  loading: false,
  loaded: false,
};

const upsertLog = (logs, incoming) => {
  if (!incoming) return logs;
  const identifier = incoming._id || incoming.tempId;
  if (!identifier) return logs;

  const index = logs.findIndex(
    (log) => log?._id === identifier || log?.tempId === identifier
  );

  if (index >= 0) {
    const next = [...logs];
    next[index] = { ...next[index], ...incoming };
    return next;
  }

  return [incoming, ...logs].slice(0, 100);
};

const callSlice = createSlice({
  name: "callLogs",
  initialState,
  reducers: {
    addTempLog: (state, action) => {
      state.logs = upsertLog(state.logs, action.payload);
    },
    updateTempLog: (state, action) => {
      const { tempId, updates } = action.payload || {};
      if (!tempId || !updates) return;
      state.logs = upsertLog(state.logs, { ...updates, _id: tempId, tempId });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCallLogsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCallLogsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.logs = Array.isArray(action.payload?.data)
          ? action.payload.data
          : [];
      })
      .addCase(fetchCallLogsThunk.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      })
      .addCase(createCallLogThunk.fulfilled, (state, action) => {
        const log = action.payload?.data;
        const tempId = action.meta?.arg?.tempId;
        if (!log) return;

        if (tempId) {
          const index = state.logs.findIndex(
            (item) => item?.tempId === tempId || item?._id === tempId
          );
          if (index >= 0) {
            const next = [...state.logs];
            next[index] = log;
            state.logs = next;
            return;
          }
        }

        state.logs = upsertLog(state.logs, log);
      });
  },
});

export const { addTempLog, updateTempLog } = callSlice.actions;
export default callSlice.reducer;
