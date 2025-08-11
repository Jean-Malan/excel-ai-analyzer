import { useState, useContext, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import { AlertContext } from "../context/AlertContext";
import { useAppState, useUser } from "../hooks/Hooks";
import { Link } from "react-router-dom";

function Login() {
  const { dispatchUser } = useContext(UserContext);
  const { dispatchAlert } = useContext(AlertContext);

  const { user } = useUser();

  useEffect(() => {
    if (user) {
      window.location.href = "/profile";
    }
  }, [user]);

  const [userDetails, setUserDetails] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      dispatchUser({ type: "LOADING" });
      const res = await fetch("http://localhost:5000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userDetails),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setTimeout(() => {
        dispatchUser({ type: "LOG_IN", payload: result.data });
        dispatchAlert({
          type: "SHOW",
          payload: result.message,
          variant: "Success",
        });
        setUserDetails({
          username: "",
          email: "",
          password: "",
        });
        window.location.href = "/profile";
      }, 3000);
    } catch (err) {
      dispatchAlert({
        type: "SHOW",
        payload: err.message,
        variant: "Warning",
      });
      dispatchUser({ type: "ERROR" });
      console.log(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setUserDetails((prevState) => {
      return {
        ...prevState,
        [name]: value,
      };
    });
  };

  return (
    <div className="flex justify-center">
      <div className="mt-20">
        <h1 className="font-bold text-3xl mb-5">Register</h1>
        <p className="mb-8">Let's get you started</p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="block py-2 px-5 rounded-lg border-2 border-slate-400 focus:border-purple-700 outline-none transition-all duration-200"
            type="email"
            name="email"
            placeholder="Email address"
            value={userDetails.email}
            onChange={handleChange}
          />
          <input
            className="block py-2 px-5 rounded-lg border-2 border-slate-400 focus:border-purple-700 outline-none transition-all duration-200"
            type="text"
            name="username"
            placeholder="Username"
            value={userDetails.username}
            onChange={handleChange}
          />
          <input
            className="block py-2 px-5 rounded-lg border-2 border-slate-400 focus:border-purple-700 outline-none transition-all duration-200"
            type="password"
            name="password"
            placeholder="Password"
            value={userDetails.password}
            onChange={handleChange}
          />
          <button
            className="block w-full bg-purple-700 text-white font-medium text-lg py-2 px-5 rounded-3xl"
            type="submit"
          >
            Register
          </button>
        </form>
        <p className="mt-5">Or <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

export default Login;
