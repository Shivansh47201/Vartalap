import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/home/Home.jsx";
import Signup from "./pages/authentication/Signup.jsx";
import Login from "./pages/authentication/Login.jsx";
import { store } from "./store/store.js";
import { Provider } from "react-redux";
import ProtectedRoute from "./components/protectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import FileViewer from "./pages/FileViewer.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicRoute>
        <Signup />
      </PublicRoute>
    ),
  },
  {
    path: "/preview",
    element: (
      <ProtectedRoute>
        <FileViewer />
      </ProtectedRoute>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
    <RouterProvider router={router} />
  </Provider>
);
