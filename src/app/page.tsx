import { Login } from "../components/auth/login";
import React, { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="">
        <Login />
      </div>
    </Suspense>

  );
}
