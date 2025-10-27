import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../../components/utilities/axiosInsatnce";

const uploadAttachments = async (files = []) => {
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

// Reusable error extraction function
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

//Send Message 
export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async (
    { conversationId, receiverId, message, attachments = [], tempId },
    { rejectWithValue }
  ) => {
    try {
      const uploadedFiles = await uploadAttachments(attachments);

      const payload = {
        conversationId,
        receiverId,
        message,
        messageType: uploadedFiles.length
          ? uploadedFiles.every((file) => file.type === "image")
            ? "image"
            : "file"
          : "text",
        attachments: uploadedFiles,
      };

      const response = await axiosInstance.post(`/message/send`, payload);
      return { ...response.data, tempId };
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

//Get Message 
export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ conversationId, cursor, limit = 20 }, { rejectWithValue }) => {
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (cursor) params.cursor = cursor;

      const response = await axiosInstance.get(`/message/${conversationId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

export const markMessagesReadThunk = createAsyncThunk(
  "message/markRead",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/message/mark-read/${conversationId}`
      );
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);
