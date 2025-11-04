import { getServerSession } from "@/lib/auth-server";
import { HomeMenu } from "./_components/home-menu";

export default async function HomePage() {
  const session = await getServerSession();
  const user = session?.user;

  const userProfile = {
    name: typeof user?.name === "string" && user.name.length > 0 ? user.name : "Gast",
    email:
      typeof user?.email === "string" && user.email.length > 0
        ? user.email
        : "unknown@example.com",
    avatar:
      typeof user?.image === "string" && user.image.length > 0
        ? user.image
        : "/avatars/shadcn.jpg",
  };

  return <HomeMenu user={userProfile} />;
}
