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

export const fetchConversationsThunk = createAsyncThunk(
  "conversation/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/conversation");
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

export const createGroupConversationThunk = createAsyncThunk(
  "conversation/createGroup",
  async ({ name, memberIds }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/conversation/group", {
        name,
        memberIds,
      });
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

export const createDirectConversationThunk = createAsyncThunk(
  "conversation/createDirect",
  async ({ memberId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/conversation/direct", {
        memberId,
      });
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

export const deleteConversationThunk = createAsyncThunk(
  "conversation/delete",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `/conversation/${conversationId}`
      );
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);
