import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../../components/utilities/axiosInsatnce";

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

//Login Thunk
export const loginUserThunk = createAsyncThunk(
  "user/loginUser",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/login", {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

//Register Thunk
export const registerUserThunk = createAsyncThunk(
  "user/registerUser",
  async ({ name, username, email, password, gender }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/register", {
        name,
        username,
        email,
        password,
        gender,
      });
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

//Logout Thunk
export const logoutUserThunk = createAsyncThunk(
  "user/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/logout");
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);


export const getUserThunk = createAsyncThunk(
  "user/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/user/me");
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);
export const getOtherUsersThunk = createAsyncThunk(
  "user/getOtherUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/user/get-other-users");
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);

export const updateUserThunk = createAsyncThunk(
  "user/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/user/update", payload);
      return response.data;
    } catch (error) {
      const errorOutput = extractErrorMessage(error);
      return rejectWithValue(errorOutput);
    }
  }
);
