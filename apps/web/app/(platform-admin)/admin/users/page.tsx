import { adminServerFetch as serverFetch } from "@/lib/admin-server-api";
import { CreateAdminForm } from "./create-admin-form";
import { EditUserDialog } from "./edit-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isPlatformAdmin: boolean;
  createdAt: string;
  _count: { memberships: number };
}

export default async function AdminUsersPage() {
  const users = await serverFetch<UserRow[]>("/admin/users");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Every user account on the platform</p>
        </div>
      </div>

      <CreateAdminForm />

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Phone</th>
            <th className="py-2 pr-4 font-medium">Organizations</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Joined</th>
            <th className="py-2 pr-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border">
              <td className="py-3 pr-4 font-medium">
                {user.name}
                {user.isPlatformAdmin && (
                  <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                    admin
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
              <td className="py-3 pr-4 text-muted-foreground">{user.phone ?? "—"}</td>
              <td className="py-3 pr-4">{user._count.memberships}</td>
              <td className="py-3 pr-4">{user.isActive ? "Active" : "Inactive"}</td>
              <td className="py-3 pr-4 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1">
                  <EditUserDialog
                    userId={user.id}
                    initialName={user.name}
                    initialEmail={user.email}
                    initialPhone={user.phone}
                  />
                  <ResetPasswordDialog userId={user.id} userEmail={user.email} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
