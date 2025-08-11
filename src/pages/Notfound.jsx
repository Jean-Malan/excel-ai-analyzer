import React, { useState, useEffect } from "react";

function Notfound() {
  const [timeOut, setTimeOut] = useState(5);

  //   TODO: Redirect after specific timeout

  //   useEffect(() => {
  //     setTimeout(() => {
  //       setTimeOut((prev) => prev - 1);
  //     }, 1000);
  //   }, []);

  //   setTimeout(() => {
  //     window.location.href = "/";
  //   }, 25000);

  return (
    <div className="text-center">
      <h1 className="text-3xl text-center mt-20 font-bold">
        Requested resource not found
      </h1>
      <p>You'll be redirected in {timeOut}</p>
    </div>
  );
}

export default Notfound;
