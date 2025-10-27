import { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { IoKey } from "react-icons/io5";
import { MdEmail } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useDispatch, useSelector } from "react-redux";
import { registerUserThunk } from "../../store/slice/user/user.thunk";

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state) => state.user);

  const [signupData, setSignUpData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
 
  useEffect(() => {
    if(isAuthenticated){
      navigate("/");
    }
  }, [isAuthenticated, navigate]);


  const handleInputChange = (e) => {
    setSignUpData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  console.log(signupData);

  const handleSignup = async () => {
    const { name, username, email, password, confirmPassword, gender } =
      signupData;

    if (
      !name ||
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !gender
    ) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password and Confirm Password do not match.");
      return;
    }

    const resultAction = await dispatch(
      registerUserThunk({ name, username, email, password, gender })
    );
    if (registerUserThunk.fulfilled.match(resultAction)) {
      toast.success("Registration successful!");
      navigate("/");
    } else {
      toast.error(resultAction.payload || "Registration failed!");
    }
  };

  return (
    <div className="flex justify-center items-center p-6 min-h-screen">
      <div className="max-w-[30rem] w-full flex flex-col bg-base-200  py-10 px-5 rounded-[15px]">
        <h2 className="mb-4 text-2xl font-semibold text-slate-400">
          Please Sign up...!!
        </h2>
        <label className="input validator w-full mb-5 ">
          <FaUser />
          <input
            type="text"
            required
            name="name"
            placeholder="Full Name"
            minLength="3"
            maxLength="30"
            onChange={handleInputChange}
            value={signupData.name}
          />
        </label>
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
            onChange={handleInputChange}
            value={signupData.username}
          />
        </label>
        <label className="input validator w-full mb-5">
          <MdEmail />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            onChange={handleInputChange}
            value={signupData.email}
          />
        </label>
        <label className="input validator w-full ">
          <IoKey />
          <input
            type="password"
            required
            name="password"
            placeholder="Password"
            minLength="8"
            pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
            title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
            onChange={handleInputChange}
            value={signupData.password}
          />
        </label>
        <label className="input validator w-full mt-6">
          <IoKey />
          <input
            type="password"
            required
            name="confirmPassword"
            placeholder="Confirm Password"
            minLength="8"
            pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
            title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
            onChange={handleInputChange}
            value={signupData.confirmPassword}
          />
        </label>

        <div className="w-full mt-5">
          <label className="text-slate-400 text-sm mb-2 block">Gender</label>
          <div className="flex w-full gap-4">
            {["male", "female"].map((genderOption) => (
              <label
                key={genderOption}
                className={`flex-1 cursor-pointer border rounded-lg px-4 py-3 flex items-center justify-center transition
          ${
            signupData.gender === genderOption
              ? "border-[#615BF6] bg-[#2f2f3a] text-white"
              : "border-base-300 bg-base-200 text-slate-400"
          }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={genderOption}
                  checked={signupData.gender === genderOption}
                  onChange={handleInputChange}
                  className="hidden"
                />
                {genderOption}
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSignup} className="btn btn-primary mt-6">
          Sign up
        </button>
        <p className="mt-3">
          Already have an account? &nbsp;
          <Link to="/login" className="text-[#615BF6] underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
