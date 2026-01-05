import { createContext, type ReactNode, useContext, useMemo } from "react";

type ResourceActions<T extends Record<string, readonly string[]>> = {
  [K in keyof T]: `${K & string}:${T[K][number]}`;
}[keyof T];

type ResourceWildcard<T extends Record<string, readonly string[]>> =
  `${keyof T & string}:*`;

type PermissionInput<T extends Record<string, readonly string[]>> =
  | "*"
  | ResourceWildcard<T>
  | ResourceActions<T>;

type PermissionsConfig<
  R extends readonly string[],
  Resources extends Record<string, readonly string[]>,
> = {
  roles: R;
  resources: Resources;
  permissions: Record<
    R[number],
    {
      can: readonly PermissionInput<Resources>[];
      inherits?: readonly R[number][];
    }
  >;
};

export function createPermissions<
  const R extends readonly string[],
  const Resources extends Record<string, readonly string[]>,
>(config: PermissionsConfig<R, Resources>) {
  type Role = R[number];
  type Permission = ResourceActions<Resources>;

  const { roles, resources, permissions } = config;

  const allRoles = new Set<Role>(roles as unknown as Role[]);

  const allPermissions = new Set<Permission>(
    Object.entries(resources).flatMap(([resource, actions]) =>
      (actions as readonly string[]).map(
        (action) => `${resource}:${action}` as Permission,
      ),
    ),
  );

  const getResourcePermissions = (resource: string): Set<Permission> => {
    const actions = resources[resource as keyof Resources];
    if (!actions) return new Set();
    return new Set(
      (actions as readonly string[]).map(
        (action) => `${resource}:${action}` as Permission,
      ),
    );
  };

  const expandPermission = (permission: string): Set<Permission> => {
    if (permission === "*") return new Set(allPermissions);
    if (permission.endsWith(":*")) {
      return getResourcePermissions(permission.slice(0, -2));
    }
    return new Set([permission as Permission]);
  };

  const resolvePermissions = (
    role: Role,
    seen = new Set<Role>(),
  ): Set<Permission> => {
    if (seen.has(role)) return new Set();
    seen.add(role);

    const roleConfig = permissions[role];
    const perms = new Set<Permission>();

    roleConfig.can.forEach((p) => {
      expandPermission(p as string).forEach((perm) => perms.add(perm));
    });

    roleConfig.inherits?.forEach((inheritedRole) => {
      resolvePermissions(inheritedRole, seen).forEach((p) => perms.add(p));
    });

    return perms;
  };

  const resolveMultipleRoles = (userRoles: Role[]): Set<Permission> => {
    const perms = new Set<Permission>();
    userRoles.forEach((role) => {
      resolvePermissions(role).forEach((p) => perms.add(p));
    });
    return perms;
  };

  const getPermissionsForRole = (role: Role): Set<Permission> => {
    return resolvePermissions(role);
  };

  const getRolesWithPermission = (permission: Permission): Set<Role> => {
    const rolesWithPermission = new Set<Role>();
    allRoles.forEach((role) => {
      if (resolvePermissions(role).has(permission)) {
        rolesWithPermission.add(role);
      }
    });
    return rolesWithPermission;
  };

  type ContextValue = {
    roles: Role[];
    permissions: Set<Permission>;
    can: (permission: Permission) => boolean;
    canAll: (permissions: Permission[]) => boolean;
    canAny: (permissions: Permission[]) => boolean;
    hasRole: (role: Role) => boolean;
    hasAllRoles: (roles: Role[]) => boolean;
    hasAnyRole: (roles: Role[]) => boolean;
    getPermissionsForRole: (role: Role) => Set<Permission>;
    getRolesWithPermission: (permission: Permission) => Set<Role>;
  };

  const PermissionContext = createContext<ContextValue | null>(null);

  function PermissionProvider({
    roles: userRoles,
    children,
  }: {
    roles: Role[];
    children: ReactNode;
  }) {
    const value = useMemo(() => {
      const perms = resolveMultipleRoles(userRoles);
      const roleSet = new Set(userRoles);

      return {
        roles: userRoles,
        permissions: perms,
        can: (permission: Permission) => perms.has(permission),
        canAll: (p: Permission[]) => p.every((perm) => perms.has(perm)),
        canAny: (p: Permission[]) => p.some((perm) => perms.has(perm)),
        hasRole: (role: Role) => roleSet.has(role),
        hasAllRoles: (r: Role[]) => r.every((role) => roleSet.has(role)),
        hasAnyRole: (r: Role[]) => r.some((role) => roleSet.has(role)),
        getPermissionsForRole,
        getRolesWithPermission,
      };
    }, [userRoles]);

    return (
      <PermissionContext.Provider value={value}>
        {children}
      </PermissionContext.Provider>
    );
  }

  function usePermissions() {
    const context = useContext(PermissionContext);
    if (!context) {
      throw new Error("usePermissions must be used within PermissionProvider");
    }
    return context;
  }

  function Can({
    do: permission,
    mode = "all",
    fallback = null,
    children,
  }: {
    do: Permission | Permission[];
    mode?: "all" | "any";
    fallback?: ReactNode;
    children: ReactNode;
  }) {
    const { canAll, canAny } = usePermissions();
    const perms = Array.isArray(permission) ? permission : [permission];
    const hasAccess = mode === "all" ? canAll(perms) : canAny(perms);
    return <>{hasAccess ? children : fallback}</>;
  }

  return {
    PermissionProvider,
    usePermissions,
    Can,
    resolvePermissions,
    resolveMultipleRoles,
    getPermissionsForRole,
    getRolesWithPermission,
    allPermissions,
    allRoles,
  };
}
