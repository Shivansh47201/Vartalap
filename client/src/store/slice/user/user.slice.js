import { createSlice } from "@reduxjs/toolkit";
import {
  loginUserThunk,
  registerUserThunk,
  logoutUserThunk,
  getUserThunk,
  getOtherUsersThunk,
  updateUserThunk,
} from "./user.thunk.js";

const demoUsers = [
  {
    _id: "demo-1",
    name: "Aarav Mehta",
    username: "aarav",
    email: "aarav@example.com",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Aarav",
    isDemo: true,
  },
  {
    _id: "demo-2",
    name: "Diya Sharma",
    username: "diya",
    email: "diya@example.com",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Diya",
    isDemo: true,
  },
  {
    _id: "demo-3",
    name: "Kabir Rao",
    username: "kabir",
    email: "kabir@example.com",
    avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Kabir",
    isDemo: true,
  },
];

const initialState = {
  isAuthenticated: false,
  userProfile: null,
  otherUsers: demoUsers,
  buttonLoading: false,
  screenLoading: true,
  selectedUser: null,
  sessionChecked: false,
  onlineUsers: [],
  typingStatus: {},
  profileUpdating: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setSelected: (state, action) => {
      state.selectedUser = action.payload;
      const userId = action.payload?._id;
      if (userId) {
        state.typingStatus = {
          ...state.typingStatus,
          [userId]: false,
        };
      }
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setTypingStatus: (state, action) => {
      const { userId, isTyping } = action.payload || {};
      if (!userId) return;
      state.typingStatus = {
        ...state.typingStatus,
        [userId]: Boolean(isTyping),
      };
    },
  },
  extraReducers: (builder) => {
    // 🔐 Login
    builder.addCase(loginUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(loginUserThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.user || action.payload;
      state.isAuthenticated = true;
      state.buttonLoading = false;
    });
    builder.addCase(loginUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    // 📝 Register
    builder.addCase(registerUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(registerUserThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.user || action.payload;
      state.buttonLoading = false;
      state.isAuthenticated = true;
    });
    builder.addCase(registerUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    // 🚪 Logout
    builder.addCase(logoutUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(logoutUserThunk.fulfilled, (state) => {
      state.userProfile = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      state.screenLoading = false;
      state.otherUsers = demoUsers;
      state.selectedUser = null;
      state.onlineUsers = [];
      state.typingStatus = {};
    });
    builder.addCase(logoutUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    // Get My Profile
    builder.addCase(getUserThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getUserThunk.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.screenLoading = false;
      state.sessionChecked = true;
      state.userProfile = action.payload?.user || action.payload;
    });
    builder.addCase(getUserThunk.rejected, (state) => {
      state.isAuthenticated = false;
      state.screenLoading = false;
      state.sessionChecked = true;
      state.userProfile = null;
      state.selectedUser = null;
      state.otherUsers = demoUsers;
      state.onlineUsers = [];
      state.typingStatus = {};
    });

    builder.addCase(getOtherUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.screenLoading = false;
      const apiUsers = action.payload?.user;
      state.otherUsers = Array.isArray(apiUsers) && apiUsers.length > 0 ? apiUsers : demoUsers;
      console.log(action.payload);
    });
    builder.addCase(getOtherUsersThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    builder.addCase(updateUserThunk.pending, (state) => {
      state.profileUpdating = true;
    });
    builder.addCase(updateUserThunk.fulfilled, (state, action) => {
      state.profileUpdating = false;
      const updatedUser = action.payload?.user || action.payload;
      if (updatedUser) {
        state.userProfile = {
          ...state.userProfile,
          ...updatedUser,
        };
      }
    });
    builder.addCase(updateUserThunk.rejected, (state) => {
      state.profileUpdating = false;
    });
  },
});

export const { setSelected, setOnlineUsers, setTypingStatus } =
  userSlice.actions;
export default userSlice.reducer;
