import { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { IoKey } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { loginUserThunk } from "../../store/slice/user/user.thunk";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state) => state.user);

  const [LoginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    console.log("isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    setLoginData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async () => {
    const resultAction = await dispatch(loginUserThunk(LoginData));
    if (loginUserThunk.fulfilled.match(resultAction)) {
      toast.success("Login Successful!");
      navigate("/");
    } else {
      toast.error(resultAction.payload || "Login failed!");
    }
  };

  return (
    <div className="flex justify-center items-center p-6 min-h-screen">
      <div className="max-w-[30rem] w-full flex flex-col bg-base-200  py-10 px-5 rounded-[15px]">
        <h2 className="mb-4 text-2xl font-semibold text-slate-400">
          Please Login...!!
        </h2>
        {/* Username */}
        <label className="input validator w-full mb-5 ">
          <FaUser />
          <input
            type="text"
            required
            name="username"
            placeholder="Username"
            pattern="[A-Za-z][A-Za-z0-9\-]*"
            minLength="3"
            maxLength="30"
            title="Only letters, numbers or dash"
            value={LoginData.username}
            onChange={handleInputChange}
          />
        </label>
        {/* Password */}
        <label className="input validator w-full ">
          <IoKey />
          <input
            type="password"
            required
            name="password"
            placeholder="Password"
            minLength="8"
            maxLength="30"
            pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
            title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
            value={LoginData.password}
            onChange={handleInputChange}
          />
        </label>

        {/* Login Button */}
        <button onClick={handleLogin} className="btn btn-primary mt-6">
          Login
        </button>
        <p className="mt-3">
          Don't have an account? &nbsp;
          <Link to="/signup" className="text-blue-500 underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
