import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../../components/utilities/axiosInsatnce";

const extractErrorMessage = (error) => {
  const resData = error?.response?.data;
  return (
    resData?.error ||
    resData?.message ||
    resData?.errorMessage ||
    error?.message ||
    "An unexpected error occurred. Please try again."
  );
};

export const fetchCallLogsThunk = createAsyncThunk(
  "callLogs/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/call-log");
      return response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createCallLogThunk = createAsyncThunk(
  "callLogs/create",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/call-log", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);
