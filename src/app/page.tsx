import { createClient } from "@/utils/supabase/server";
import { Login } from "../components/auth/login";
import React, { Suspense } from "react";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        return redirect("/homePage");
    }
    else {
      return redirect("/auth/login");
  }
    
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="">
        <Login />
      </div>
    </Suspense>

  );
}
