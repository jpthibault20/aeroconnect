import { getUser } from "@/api/db/users";
import { redirect } from "next/navigation";

export default async function Home() {

  const user = await getUser()

  if (user) {
    return redirect(`/calendar?clubID=${user.user?.clubID}`);
  }
  else {
    return redirect("/auth/login");
  };
}
