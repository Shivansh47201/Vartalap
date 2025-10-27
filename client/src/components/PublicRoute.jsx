import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.user);
  return !isAuthenticated ? children : <Navigate to="/" />;
};

export default PublicRoute;