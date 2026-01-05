import { createPermissions } from "../../src/../../src/index";

export const { PermissionProvider, usePermissions, Can } = createPermissions({
  roles: ["dev", "admin", "user", "guest"],
  resources: {
    posts: ["create", "read", "update", "delete"],
    users: ["read", "invite", "ban"],
  },
  permissions: {
    dev: { can: ["*"] },
    admin: {
      can: ["users:*"],
      inherits: ["user"],
    },
    user: {
      can: ["posts:create", "posts:update"],
      inherits: ["guest"],
    },
    guest: {
      can: ["posts:read", "users:read"],
    },
  },
});
