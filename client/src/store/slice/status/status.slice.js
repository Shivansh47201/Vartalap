import { createSlice } from "@reduxjs/toolkit";
import {
  createStatusThunk,
  fetchMyStatusesThunk,
  fetchStatusFeedThunk,
} from "./status.thunk";

const initialState = {
  feed: [],
  mine: [],
  loadingFeed: false,
  loadingMine: false,
  creating: false,
  feedLoaded: false,
  mineLoaded: false,
};

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStatusFeedThunk.pending, (state) => {
        state.loadingFeed = true;
      })
      .addCase(fetchStatusFeedThunk.fulfilled, (state, action) => {
        state.loadingFeed = false;
        state.feedLoaded = true;
        state.feed = Array.isArray(action.payload?.data)
          ? action.payload.data
          : [];
      })
      .addCase(fetchStatusFeedThunk.rejected, (state) => {
        state.loadingFeed = false;
        state.feedLoaded = true;
      })
      .addCase(fetchMyStatusesThunk.pending, (state) => {
        state.loadingMine = true;
      })
      .addCase(fetchMyStatusesThunk.fulfilled, (state, action) => {
        state.loadingMine = false;
        state.mineLoaded = true;
        state.mine = Array.isArray(action.payload?.data)
          ? action.payload.data
          : [];
      })
      .addCase(fetchMyStatusesThunk.rejected, (state) => {
        state.loadingMine = false;
        state.mineLoaded = true;
      })
      .addCase(createStatusThunk.pending, (state) => {
        state.creating = true;
      })
      .addCase(createStatusThunk.fulfilled, (state, action) => {
        state.creating = false;
        const statusDoc = action.payload?.data;
        if (statusDoc) {
          state.mine = [statusDoc, ...state.mine];
        }
      })
      .addCase(createStatusThunk.rejected, (state) => {
        state.creating = false;
      });
  },
});

export default statusSlice.reducer;
