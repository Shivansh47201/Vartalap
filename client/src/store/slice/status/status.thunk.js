import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../../components/utilities/axiosInsatnce";

const uploadStatusAttachments = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => {
    if (file) {
      formData.append("attachments", file);
    }
  });

  const response = await axiosInstance.post("/uploads/message", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data?.files || [];
};

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

export const fetchStatusFeedThunk = createAsyncThunk(
  "status/fetchFeed",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/status/feed");
      return response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchMyStatusesThunk = createAsyncThunk(
  "status/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/status/me");
      return response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createStatusThunk = createAsyncThunk(
  "status/create",
  async ({ content, attachments = [], visibility = "public" }, { rejectWithValue }) => {
    try {
      const uploadedFiles = await uploadStatusAttachments(attachments);

      const payload = {
        content,
        visibility,
        attachments: uploadedFiles,
      };

      const response = await axiosInstance.post("/status", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);
