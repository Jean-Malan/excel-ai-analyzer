import React from "react";
import { Link } from "react-router-dom";
import { useUser } from "../hooks/Hooks";

export const Home = () => {
  const { user } = useUser();

  return (
    <div className="flex justify-center mt-20">
      <div className=" space-y-4">
        <h1 className="text-2xl font-semibold">
          Welcome home, {user ? user.username : "Buddy"}!
        </h1>

        {!user && (
          <Link
            className="block mt-5 w-full bg-blue-700 text-center text-white font-medium text-lg
        py-2 px-5 rounded-3xl"
            to="/login"
          >
            Log in
          </Link>
        )}
        <Link
          className="block mt-5 w-full bg-blue-700 text-center text-white font-medium text-lg
        py-2 px-5 rounded-3xl"
          to="/profile"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Home;
