import { serverFetch } from "@/lib/server-api";
import { TeamManager, type Member, type Invitation } from "./team-manager";

interface CurrentUser {
  id: string;
}

export default async function TeamPage() {
  const [me, members, invitations] = await Promise.all([
    serverFetch<CurrentUser>("/auth/me"),
    serverFetch<Member[]>("/members"),
    serverFetch<Invitation[]>("/members/invitations"),
  ]);

  const myMembership = members.find((m) => m.user.id === me.id);
  const isOwner = myMembership?.role === "OWNER";

  return <TeamManager members={members} invitations={invitations} currentUserId={me.id} isOwner={isOwner} />;
}
