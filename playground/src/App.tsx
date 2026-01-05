import { Can, PermissionProvider, usePermissions } from "./config/permissions";

export function App() {
  return (
    <PermissionProvider roles={["user"]}>
      <Dashboard />
    </PermissionProvider>
  );
}

function Dashboard() {
  const { can, hasRole } = usePermissions();

  if (!hasRole("user")) {
    return <div>You are not a user</div>;
  }

  if (!can("posts:create")) {
    return <div>You cannot create posts</div>;
  }

  return (
    <div>
      <Can do="posts:create">
        <p>You can create posts</p>
      </Can>

      <Can do="users:ban">
        <p>You can ban users</p>
      </Can>
    </div>
  );
}
