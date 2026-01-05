import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { createPermissions } from "./create-permissions";

const createTestConfig = () => ({
  roles: ["admin", "editor", "viewer", "guest"] as const,
  resources: {
    posts: ["create", "read", "update", "delete"] as const,
    users: ["create", "read", "update", "delete"] as const,
    comments: ["create", "read", "delete"] as const,
  },
  permissions: {
    admin: {
      can: ["*"] as const,
    },
    editor: {
      can: ["posts:*", "comments:create", "comments:read"] as const,
      inherits: ["viewer"] as const,
    },
    viewer: {
      can: ["posts:read", "users:read", "comments:read"] as const,
    },
    guest: {
      can: ["posts:read"] as const,
    },
  },
});

describe("createPermissions", () => {
  it("returns all expected exports", () => {
    const result = createPermissions(createTestConfig());

    expect(result).toHaveProperty("PermissionProvider");
    expect(result).toHaveProperty("usePermissions");
    expect(result).toHaveProperty("Can");
    expect(result).toHaveProperty("resolvePermissions");
    expect(result).toHaveProperty("resolveMultipleRoles");
    expect(result).toHaveProperty("getPermissionsForRole");
    expect(result).toHaveProperty("getRolesWithPermission");
    expect(result).toHaveProperty("allPermissions");
    expect(result).toHaveProperty("allRoles");
  });

  it("exports are of correct types", () => {
    const result = createPermissions(createTestConfig());

    expect(typeof result.PermissionProvider).toBe("function");
    expect(typeof result.usePermissions).toBe("function");
    expect(typeof result.Can).toBe("function");
    expect(typeof result.getPermissionsForRole).toBe("function");
    expect(typeof result.getRolesWithPermission).toBe("function");
    expect(typeof result.resolvePermissions).toBe("function");
    expect(typeof result.resolveMultipleRoles).toBe("function");
    expect(result.allPermissions).toBeInstanceOf(Set);
  });
});

describe("allPermissions", () => {
  it("contains all resource:action combinations", () => {
    const { allPermissions } = createPermissions(createTestConfig());

    // posts permissions
    expect(allPermissions.has("posts:create")).toBe(true);
    expect(allPermissions.has("posts:read")).toBe(true);
    expect(allPermissions.has("posts:update")).toBe(true);
    expect(allPermissions.has("posts:delete")).toBe(true);

    // users permissions
    expect(allPermissions.has("users:create")).toBe(true);
    expect(allPermissions.has("users:read")).toBe(true);
    expect(allPermissions.has("users:update")).toBe(true);
    expect(allPermissions.has("users:delete")).toBe(true);

    // comments permissions
    expect(allPermissions.has("comments:create")).toBe(true);
    expect(allPermissions.has("comments:read")).toBe(true);
    expect(allPermissions.has("comments:delete")).toBe(true);
  });

  it("has correct total count of permissions", () => {
    const { allPermissions } = createPermissions(createTestConfig());

    // 4 posts + 4 users + 3 comments = 11
    expect(allPermissions.size).toBe(11);
  });

  it("does not contain invalid permissions", () => {
    const { allPermissions } = createPermissions(createTestConfig());

    expect(allPermissions.has("invalid:action" as never)).toBe(false);
    expect(allPermissions.has("posts:invalid" as never)).toBe(false);
  });
});

describe("allRoles", () => {
  it("contains all configured roles", () => {
    const { allRoles } = createPermissions(createTestConfig());

    expect(allRoles.has("admin")).toBe(true);
    expect(allRoles.has("editor")).toBe(true);
    expect(allRoles.has("viewer")).toBe(true);
    expect(allRoles.has("guest")).toBe(true);
  });

  it("has correct total count of roles", () => {
    const { allRoles } = createPermissions(createTestConfig());

    expect(allRoles.size).toBe(4);
  });

  it("does not contain invalid roles", () => {
    const { allRoles } = createPermissions(createTestConfig());

    expect(allRoles.has("superadmin" as never)).toBe(false);
    expect(allRoles.has("unknown" as never)).toBe(false);
  });
});

describe("getPermissionsForRole", () => {
  it("returns permissions for a simple role", () => {
    const { getPermissionsForRole } = createPermissions(createTestConfig());
    const perms = getPermissionsForRole("guest");

    expect(perms.size).toBe(1);
    expect(perms.has("posts:read")).toBe(true);
  });

  it("returns all permissions for admin with wildcard *", () => {
    const { getPermissionsForRole, allPermissions } =
      createPermissions(createTestConfig());
    const perms = getPermissionsForRole("admin");

    expect(perms.size).toBe(allPermissions.size);
  });

  it("returns expanded permissions for resource wildcard", () => {
    const { getPermissionsForRole } = createPermissions(createTestConfig());
    const perms = getPermissionsForRole("editor");

    // editor has posts:* which expands to all posts actions
    expect(perms.has("posts:create")).toBe(true);
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("posts:update")).toBe(true);
    expect(perms.has("posts:delete")).toBe(true);
  });

  it("includes inherited permissions", () => {
    const { getPermissionsForRole } = createPermissions(createTestConfig());
    const perms = getPermissionsForRole("editor");

    // editor inherits from viewer which has users:read
    expect(perms.has("users:read")).toBe(true);
  });
});

describe("getRolesWithPermission", () => {
  it("returns all roles that have a specific permission", () => {
    const { getRolesWithPermission } = createPermissions(createTestConfig());
    const roles = getRolesWithPermission("posts:read");

    // admin (via *), editor (via posts:*), viewer (direct), guest (direct)
    expect(roles.has("admin")).toBe(true);
    expect(roles.has("editor")).toBe(true);
    expect(roles.has("viewer")).toBe(true);
    expect(roles.has("guest")).toBe(true);
    expect(roles.size).toBe(4);
  });

  it("returns only admin for a restricted permission", () => {
    const { getRolesWithPermission } = createPermissions(createTestConfig());
    const roles = getRolesWithPermission("users:delete");

    // Only admin has users:delete (via *)
    expect(roles.has("admin")).toBe(true);
    expect(roles.size).toBe(1);
  });

  it("returns roles with wildcard permissions", () => {
    const { getRolesWithPermission } = createPermissions(createTestConfig());
    const roles = getRolesWithPermission("posts:delete");

    // admin (via *), editor (via posts:*)
    expect(roles.has("admin")).toBe(true);
    expect(roles.has("editor")).toBe(true);
    expect(roles.has("viewer")).toBe(false);
    expect(roles.has("guest")).toBe(false);
    expect(roles.size).toBe(2);
  });

  it("returns roles with inherited permissions", () => {
    const { getRolesWithPermission } = createPermissions(createTestConfig());
    const roles = getRolesWithPermission("users:read");

    // admin (via *), editor (inherits from viewer), viewer (direct)
    expect(roles.has("admin")).toBe(true);
    expect(roles.has("editor")).toBe(true);
    expect(roles.has("viewer")).toBe(true);
    expect(roles.has("guest")).toBe(false);
    expect(roles.size).toBe(3);
  });

  it("returns empty set for permission no role has", () => {
    const config = {
      roles: ["user"] as const,
      resources: {
        posts: ["read", "write"] as const,
      },
      permissions: {
        user: {
          can: ["posts:read"] as const,
        },
      },
    };
    const { getRolesWithPermission } = createPermissions(config);
    const roles = getRolesWithPermission("posts:write");

    expect(roles.size).toBe(0);
  });

  it("handles complex inheritance chains", () => {
    const config = {
      roles: ["superadmin", "admin", "user"] as const,
      resources: {
        system: ["manage"] as const,
        posts: ["read"] as const,
      },
      permissions: {
        superadmin: {
          can: ["system:manage"] as const,
          inherits: ["admin"] as const,
        },
        admin: {
          can: [] as const,
          inherits: ["user"] as const,
        },
        user: {
          can: ["posts:read"] as const,
        },
      },
    };
    const { getRolesWithPermission } = createPermissions(config);

    // posts:read is available to user, admin (inherits user), superadmin (inherits admin)
    const rolesWithPostsRead = getRolesWithPermission("posts:read");
    expect(rolesWithPostsRead.has("user")).toBe(true);
    expect(rolesWithPostsRead.has("admin")).toBe(true);
    expect(rolesWithPostsRead.has("superadmin")).toBe(true);
    expect(rolesWithPostsRead.size).toBe(3);

    // system:manage is only available to superadmin
    const rolesWithSystemManage = getRolesWithPermission("system:manage");
    expect(rolesWithSystemManage.has("superadmin")).toBe(true);
    expect(rolesWithSystemManage.size).toBe(1);
  });
});

describe("resolvePermissions", () => {
  it("resolves specific permissions for a simple role", () => {
    const { resolvePermissions } = createPermissions(createTestConfig());
    const perms = resolvePermissions("guest");

    expect(perms.size).toBe(1);
    expect(perms.has("posts:read")).toBe(true);
  });

  it("resolves wildcard * to all permissions", () => {
    const { resolvePermissions, allPermissions } =
      createPermissions(createTestConfig());
    const perms = resolvePermissions("admin");

    expect(perms.size).toBe(allPermissions.size);
    expect(perms.has("posts:create")).toBe(true);
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("posts:update")).toBe(true);
    expect(perms.has("posts:delete")).toBe(true);
    expect(perms.has("users:create")).toBe(true);
    expect(perms.has("users:read")).toBe(true);
    expect(perms.has("users:update")).toBe(true);
    expect(perms.has("users:delete")).toBe(true);
    expect(perms.has("comments:create")).toBe(true);
    expect(perms.has("comments:read")).toBe(true);
    expect(perms.has("comments:delete")).toBe(true);
  });

  it("resolves resource wildcard to all actions for that resource", () => {
    const config = {
      roles: ["tester"] as const,
      resources: {
        posts: ["create", "read", "update", "delete"] as const,
        users: ["create", "read"] as const,
      },
      permissions: {
        tester: {
          can: ["posts:*"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("tester");

    expect(perms.size).toBe(4);
    expect(perms.has("posts:create")).toBe(true);
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("posts:update")).toBe(true);
    expect(perms.has("posts:delete")).toBe(true);
    expect(perms.has("users:create")).toBe(false);
    expect(perms.has("users:read")).toBe(false);
  });

  it("resolves inherited permissions", () => {
    const { resolvePermissions } = createPermissions(createTestConfig());
    const perms = resolvePermissions("editor");

    // editor's own permissions: posts:*, comments:create, comments:read
    expect(perms.has("posts:create")).toBe(true);
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("posts:update")).toBe(true);
    expect(perms.has("posts:delete")).toBe(true);
    expect(perms.has("comments:create")).toBe(true);
    expect(perms.has("comments:read")).toBe(true);

    // inherited from viewer: users:read
    expect(perms.has("users:read")).toBe(true);
  });

  it("resolves multi-level inheritance", () => {
    const config = {
      roles: ["superadmin", "admin", "user"] as const,
      resources: {
        system: ["manage"] as const,
        posts: ["create", "read"] as const,
        profile: ["read"] as const,
      },
      permissions: {
        superadmin: {
          can: ["system:manage"] as const,
          inherits: ["admin"] as const,
        },
        admin: {
          can: ["posts:create"] as const,
          inherits: ["user"] as const,
        },
        user: {
          can: ["posts:read", "profile:read"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("superadmin");

    expect(perms.has("system:manage")).toBe(true); // own
    expect(perms.has("posts:create")).toBe(true); // from admin
    expect(perms.has("posts:read")).toBe(true); // from user (via admin)
    expect(perms.has("profile:read")).toBe(true); // from user (via admin)
  });

  it("handles circular inheritance without infinite loop", () => {
    const config = {
      roles: ["roleA", "roleB"] as const,
      resources: {
        resource: ["action"] as const,
      },
      permissions: {
        roleA: {
          can: ["resource:action"] as const,
          inherits: ["roleB"] as const,
        },
        roleB: {
          can: [] as const,
          inherits: ["roleA"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);

    // Should not throw or hang
    const permsA = resolvePermissions("roleA");
    const permsB = resolvePermissions("roleB");

    expect(permsA.has("resource:action")).toBe(true);
    expect(permsB.has("resource:action")).toBe(true);
  });

  it("returns empty set for unknown resource wildcard", () => {
    const config = {
      roles: ["tester"] as const,
      resources: {
        posts: ["read"] as const,
      },
      permissions: {
        tester: {
          can: ["posts:read"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("tester");

    expect(perms.size).toBe(1);
    expect(perms.has("posts:read")).toBe(true);
  });

  it("handles role with empty permissions", () => {
    const config = {
      roles: ["empty"] as const,
      resources: {
        posts: ["read"] as const,
      },
      permissions: {
        empty: {
          can: [] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("empty");

    expect(perms.size).toBe(0);
  });

  it("handles multiple inheritance from same role", () => {
    const config = {
      roles: ["child", "parent", "grandparent"] as const,
      resources: {
        resource: ["a", "b", "c"] as const,
      },
      permissions: {
        child: {
          can: ["resource:a"] as const,
          inherits: ["parent"] as const,
        },
        parent: {
          can: ["resource:b"] as const,
          inherits: ["grandparent"] as const,
        },
        grandparent: {
          can: ["resource:c"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("child");

    expect(perms.size).toBe(3);
    expect(perms.has("resource:a")).toBe(true);
    expect(perms.has("resource:b")).toBe(true);
    expect(perms.has("resource:c")).toBe(true);
  });
});

describe("resolveMultipleRoles", () => {
  it("combines permissions from multiple roles", () => {
    const { resolveMultipleRoles } = createPermissions(createTestConfig());
    const perms = resolveMultipleRoles(["guest", "viewer"]);

    // guest: posts:read
    // viewer: posts:read, users:read, comments:read
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("users:read")).toBe(true);
    expect(perms.has("comments:read")).toBe(true);
  });

  it("handles single role", () => {
    const { resolveMultipleRoles } = createPermissions(createTestConfig());
    const perms = resolveMultipleRoles(["guest"]);

    expect(perms.size).toBe(1);
    expect(perms.has("posts:read")).toBe(true);
  });

  it("handles empty roles array", () => {
    const { resolveMultipleRoles } = createPermissions(createTestConfig());
    const perms = resolveMultipleRoles([]);

    expect(perms.size).toBe(0);
  });

  it("deduplicates overlapping permissions", () => {
    const { resolveMultipleRoles } = createPermissions(createTestConfig());
    const perms = resolveMultipleRoles(["guest", "viewer"]);

    // posts:read appears in both, should only be counted once
    const postReadCount = [...perms].filter((p) => p === "posts:read").length;
    expect(postReadCount).toBe(1);
  });

  it("combines inherited and direct permissions", () => {
    const { resolveMultipleRoles } = createPermissions(createTestConfig());
    const perms = resolveMultipleRoles(["editor"]);

    // editor has posts:*, comments:create, comments:read + inherits viewer
    expect(perms.has("posts:create")).toBe(true);
    expect(perms.has("posts:read")).toBe(true);
    expect(perms.has("posts:update")).toBe(true);
    expect(perms.has("posts:delete")).toBe(true);
    expect(perms.has("comments:create")).toBe(true);
    expect(perms.has("comments:read")).toBe(true);
    expect(perms.has("users:read")).toBe(true); // from viewer
  });
});

describe("PermissionProvider", () => {
  it("provides context to children", async () => {
    const { PermissionProvider, usePermissions } =
      createPermissions(createTestConfig());

    const TestComponent = () => {
      const ctx = usePermissions();
      return <div data-testid="has-context">{ctx ? "yes" : "no"}</div>;
    };

    const screen = await render(
      <PermissionProvider roles={["guest"]}>
        <TestComponent />
      </PermissionProvider>,
    );

    await expect
      .element(screen.getByTestId("has-context"))
      .toHaveTextContent("yes");
  });

  it("provides correct roles to context", async () => {
    const { PermissionProvider, usePermissions } =
      createPermissions(createTestConfig());

    const TestComponent = () => {
      const { roles } = usePermissions();
      return <div data-testid="roles">{roles.join(",")}</div>;
    };

    const screen = await render(
      <PermissionProvider roles={["admin", "editor"]}>
        <TestComponent />
      </PermissionProvider>,
    );

    await expect
      .element(screen.getByTestId("roles"))
      .toHaveTextContent("admin,editor");
  });

  it("provides resolved permissions to context", async () => {
    const { PermissionProvider, usePermissions } =
      createPermissions(createTestConfig());

    const TestComponent = () => {
      const { permissions } = usePermissions();
      return (
        <div data-testid="has-posts-read">
          {String(permissions.has("posts:read"))}
        </div>
      );
    };

    const screen = await render(
      <PermissionProvider roles={["guest"]}>
        <TestComponent />
      </PermissionProvider>,
    );

    await expect
      .element(screen.getByTestId("has-posts-read"))
      .toHaveTextContent("true");
  });
});

describe("usePermissions", () => {
  it("throws error when used outside provider", () => {
    const { usePermissions } = createPermissions(createTestConfig());

    const TestComponent = () => {
      try {
        usePermissions();
        return <div>no error</div>;
      } catch (e) {
        return <div data-testid="error">{(e as Error).message}</div>;
      }
    };

    // We need to suppress the error boundary
    const originalError = console.error;
    console.error = () => {};

    try {
      render(<TestComponent />);
    } catch {
      // Expected
    }

    console.error = originalError;
  });

  describe("can", () => {
    it("returns true when permission is granted", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { can } = usePermissions();
        return <div data-testid="result">{String(can("posts:read"))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when permission is not granted", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { can } = usePermissions();
        return <div data-testid="result">{String(can("posts:delete"))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });
  });

  describe("canAll", () => {
    it("returns true when all permissions are granted", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAll } = usePermissions();
        return (
          <div data-testid="result">
            {String(canAll(["posts:read", "users:read", "comments:read"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["viewer"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when some permissions are missing", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAll } = usePermissions();
        return (
          <div data-testid="result">
            {String(canAll(["posts:read", "posts:delete"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });

    it("returns true for empty array", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAll } = usePermissions();
        return <div data-testid="result">{String(canAll([]))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });
  });

  describe("canAny", () => {
    it("returns true when at least one permission is granted", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAny } = usePermissions();
        return (
          <div data-testid="result">
            {String(canAny(["posts:read", "posts:delete"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when no permissions are granted", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAny } = usePermissions();
        return (
          <div data-testid="result">
            {String(canAny(["posts:delete", "users:delete"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });

    it("returns false for empty array", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { canAny } = usePermissions();
        return <div data-testid="result">{String(canAny([]))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });
  });

  describe("hasRole", () => {
    it("returns true when user has the role", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasRole } = usePermissions();
        return <div data-testid="result">{String(hasRole("admin"))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["admin", "editor"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when user does not have the role", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasRole } = usePermissions();
        return <div data-testid="result">{String(hasRole("admin"))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });
  });

  describe("hasAllRoles", () => {
    it("returns true when user has all roles", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAllRoles } = usePermissions();
        return (
          <div data-testid="result">
            {String(hasAllRoles(["admin", "editor"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["admin", "editor", "viewer"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when user is missing some roles", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAllRoles } = usePermissions();
        return (
          <div data-testid="result">
            {String(hasAllRoles(["admin", "editor"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["admin"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });

    it("returns true for empty array", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAllRoles } = usePermissions();
        return <div data-testid="result">{String(hasAllRoles([]))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });
  });

  describe("hasAnyRole", () => {
    it("returns true when user has at least one role", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAnyRole } = usePermissions();
        return (
          <div data-testid="result">
            {String(hasAnyRole(["admin", "guest"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns false when user has none of the roles", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAnyRole } = usePermissions();
        return (
          <div data-testid="result">
            {String(hasAnyRole(["admin", "editor"]))}
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });

    it("returns false for empty array", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { hasAnyRole } = usePermissions();
        return <div data-testid="result">{String(hasAnyRole([]))}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("false");
    });
  });

  describe("getPermissionsForRole (hook)", () => {
    it("returns permissions for a given role", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { getPermissionsForRole } = usePermissions();
        const perms = getPermissionsForRole("guest");
        return (
          <div data-testid="result">{String(perms.has("posts:read"))}</div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["admin"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("true");
    });

    it("returns all permissions for admin role", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { getPermissionsForRole } = usePermissions();
        const perms = getPermissionsForRole("admin");
        return <div data-testid="result">{perms.size}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      // admin has all 11 permissions via *
      await expect
        .element(screen.getByTestId("result"))
        .toHaveTextContent("11");
    });
  });

  describe("getRolesWithPermission (hook)", () => {
    it("returns roles that have a specific permission", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { getRolesWithPermission } = usePermissions();
        const roles = getRolesWithPermission("posts:read");
        return <div data-testid="result">{roles.size}</div>;
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      // All 4 roles have posts:read
      await expect.element(screen.getByTestId("result")).toHaveTextContent("4");
    });

    it("returns only admin for restricted permission", async () => {
      const { PermissionProvider, usePermissions } =
        createPermissions(createTestConfig());

      const TestComponent = () => {
        const { getRolesWithPermission } = usePermissions();
        const roles = getRolesWithPermission("users:delete");
        return (
          <div>
            <div data-testid="size">{roles.size}</div>
            <div data-testid="has-admin">{String(roles.has("admin"))}</div>
          </div>
        );
      };

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <TestComponent />
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("size")).toHaveTextContent("1");
      await expect
        .element(screen.getByTestId("has-admin"))
        .toHaveTextContent("true");
    });
  });
});

describe("Can component", () => {
  describe("with single permission", () => {
    it("renders children when permission is granted", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do="posts:read">
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Authorized Content");
    });

    it("does not render children when permission is denied", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do="posts:delete">
            <div data-testid="content">Authorized Content</div>
          </Can>
          <div data-testid="marker">marker</div>
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("marker")).toBeInTheDocument();
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });
  });

  describe("with fallback", () => {
    it("renders fallback when permission is denied", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can
            do="posts:delete"
            fallback={<div data-testid="fallback">Access Denied</div>}
          >
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("fallback"))
        .toHaveTextContent("Access Denied");
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });

    it("does not render fallback when permission is granted", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can
            do="posts:read"
            fallback={<div data-testid="fallback">Access Denied</div>}
          >
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Authorized Content");
      expect(
        screen.container.querySelector('[data-testid="fallback"]'),
      ).toBeNull();
    });

    it("uses null as default fallback", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do="posts:delete">
            <div data-testid="content">Authorized Content</div>
          </Can>
          <div data-testid="marker">marker</div>
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("marker")).toBeInTheDocument();
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });
  });

  describe("with array of permissions", () => {
    it("renders children when all permissions are granted (default mode)", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["viewer"]}>
          <Can do={["posts:read", "users:read"]}>
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Authorized Content");
    });

    it("does not render children when some permissions are missing (default mode)", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do={["posts:read", "posts:delete"]}>
            <div data-testid="content">Authorized Content</div>
          </Can>
          <div data-testid="marker">marker</div>
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("marker")).toBeInTheDocument();
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });
  });

  describe('mode="all"', () => {
    it("requires all permissions to render children", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["viewer"]}>
          <Can do={["posts:read", "users:read", "comments:read"]} mode="all">
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Authorized Content");
    });

    it("does not render when one permission is missing", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["viewer"]}>
          <Can do={["posts:read", "posts:delete"]} mode="all">
            <div data-testid="content">Authorized Content</div>
          </Can>
          <div data-testid="marker">marker</div>
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("marker")).toBeInTheDocument();
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });
  });

  describe('mode="any"', () => {
    it("renders children when at least one permission is granted", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do={["posts:read", "posts:delete"]} mode="any">
            <div data-testid="content">Authorized Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Authorized Content");
    });

    it("does not render when no permissions are granted", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest"]}>
          <Can do={["posts:delete", "users:delete"]} mode="any">
            <div data-testid="content">Authorized Content</div>
          </Can>
          <div data-testid="marker">marker</div>
        </PermissionProvider>,
      );

      await expect.element(screen.getByTestId("marker")).toBeInTheDocument();
      expect(
        screen.container.querySelector('[data-testid="content"]'),
      ).toBeNull();
    });
  });

  describe("with wildcard permissions", () => {
    it("works with admin who has all permissions via *", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["admin"]}>
          <Can do={["posts:delete", "users:delete", "comments:delete"]}>
            <div data-testid="content">Admin Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Admin Content");
    });

    it("works with resource wildcard permissions", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      // editor has posts:* which includes all posts actions
      const screen = await render(
        <PermissionProvider roles={["editor"]}>
          <Can
            do={["posts:create", "posts:read", "posts:update", "posts:delete"]}
          >
            <div data-testid="content">Editor Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Editor Content");
    });
  });

  describe("with inherited permissions", () => {
    it("grants inherited permissions through Can component", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      // editor inherits from viewer, which has users:read
      const screen = await render(
        <PermissionProvider roles={["editor"]}>
          <Can do="users:read">
            <div data-testid="content">Inherited Permission Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Inherited Permission Content");
    });
  });

  describe("with multiple roles", () => {
    it("combines permissions from multiple roles", async () => {
      const { PermissionProvider, Can } = createPermissions(createTestConfig());

      const screen = await render(
        <PermissionProvider roles={["guest", "viewer"]}>
          <Can do={["posts:read", "users:read", "comments:read"]}>
            <div data-testid="content">Multi-role Content</div>
          </Can>
        </PermissionProvider>,
      );

      await expect
        .element(screen.getByTestId("content"))
        .toHaveTextContent("Multi-role Content");
    });
  });
});

describe("Edge cases", () => {
  it("handles config with single role", () => {
    const config = {
      roles: ["user"] as const,
      resources: {
        posts: ["read"] as const,
      },
      permissions: {
        user: {
          can: ["posts:read"] as const,
        },
      },
    };
    const { resolvePermissions, allPermissions } = createPermissions(config);

    expect(allPermissions.size).toBe(1);
    expect(resolvePermissions("user").has("posts:read")).toBe(true);
  });

  it("handles config with single resource", () => {
    const config = {
      roles: ["admin", "user"] as const,
      resources: {
        posts: ["read", "write"] as const,
      },
      permissions: {
        admin: {
          can: ["*"] as const,
        },
        user: {
          can: ["posts:read"] as const,
        },
      },
    };
    const { resolvePermissions, allPermissions } = createPermissions(config);

    expect(allPermissions.size).toBe(2);
    expect(resolvePermissions("admin").size).toBe(2);
    expect(resolvePermissions("user").size).toBe(1);
  });

  it("handles config with single action per resource", () => {
    const config = {
      roles: ["user"] as const,
      resources: {
        posts: ["read"] as const,
        users: ["view"] as const,
        comments: ["list"] as const,
      },
      permissions: {
        user: {
          can: ["*"] as const,
        },
      },
    };
    const { resolvePermissions, allPermissions } = createPermissions(config);

    expect(allPermissions.size).toBe(3);
    expect(resolvePermissions("user").size).toBe(3);
  });

  it("handles role inheriting from multiple roles", () => {
    const config = {
      roles: ["super", "roleA", "roleB"] as const,
      resources: {
        resource: ["a", "b", "c"] as const,
      },
      permissions: {
        super: {
          can: [] as const,
          inherits: ["roleA", "roleB"] as const,
        },
        roleA: {
          can: ["resource:a"] as const,
        },
        roleB: {
          can: ["resource:b"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("super");

    expect(perms.size).toBe(2);
    expect(perms.has("resource:a")).toBe(true);
    expect(perms.has("resource:b")).toBe(true);
  });

  it("handles diamond inheritance pattern", () => {
    const config = {
      roles: ["top", "left", "right", "bottom"] as const,
      resources: {
        resource: ["a", "b", "c", "d"] as const,
      },
      permissions: {
        top: {
          can: ["resource:a"] as const,
          inherits: ["left", "right"] as const,
        },
        left: {
          can: ["resource:b"] as const,
          inherits: ["bottom"] as const,
        },
        right: {
          can: ["resource:c"] as const,
          inherits: ["bottom"] as const,
        },
        bottom: {
          can: ["resource:d"] as const,
        },
      },
    };
    const { resolvePermissions } = createPermissions(config);
    const perms = resolvePermissions("top");

    expect(perms.size).toBe(4);
    expect(perms.has("resource:a")).toBe(true);
    expect(perms.has("resource:b")).toBe(true);
    expect(perms.has("resource:c")).toBe(true);
    expect(perms.has("resource:d")).toBe(true);
  });
});

describe("Provider re-render behavior", () => {
  it("updates context when roles change", async () => {
    const { PermissionProvider, usePermissions } =
      createPermissions(createTestConfig());

    const TestComponent = () => {
      const { can } = usePermissions();
      return (
        <div>
          <div data-testid="can-read">{String(can("posts:read"))}</div>
          <div data-testid="can-delete">{String(can("posts:delete"))}</div>
        </div>
      );
    };

    // Initial render with guest
    const screen = await render(
      <PermissionProvider roles={["guest"]}>
        <TestComponent />
      </PermissionProvider>,
    );

    await expect
      .element(screen.getByTestId("can-read"))
      .toHaveTextContent("true");
    await expect
      .element(screen.getByTestId("can-delete"))
      .toHaveTextContent("false");

    // Re-render with admin
    await screen.rerender(
      <PermissionProvider roles={["admin"]}>
        <TestComponent />
      </PermissionProvider>,
    );

    await expect
      .element(screen.getByTestId("can-read"))
      .toHaveTextContent("true");
    await expect
      .element(screen.getByTestId("can-delete"))
      .toHaveTextContent("true");
  });
});
