# react-rbac-permissions 

Type-safe role-based access control (RBAC) for React with declarative components and hooks.

## Features

- 🔒 **Type-safe** — Full TypeScript support with autocomplete for roles and permissions
- 🎯 **Declarative** — `<Can>` component for conditional rendering
- 🪝 **Hooks** — `usePermissions` hook for programmatic access
- 🔗 **Role inheritance** — Roles can inherit permissions from other roles
- 🃏 **Wildcards** — Support for `*` (all) and `resource:*` (all actions) patterns
- 📦 **Lightweight** — Zero dependencies, tiny bundle size

## Installation

```bash
pnpm add react-rbac-permissions
```

## Quick Start

### 1. Define your permissions config

```tsx
// permissions.ts
import { createPermissions } from 'react-rbac-permissions'

export const {
  PermissionProvider,
  usePermissions,
  Can,
} = createPermissions({
  roles: ['admin', 'editor', 'viewer'],
  resources: {
    posts: ['create', 'read', 'update', 'delete'],
    users: ['read', 'invite', 'ban'],
  },
  permissions: {
    admin: {
      can: ['*'], // all permissions
    },
    editor: {
      can: ['posts:*'], // all post actions
      inherits: ['viewer'],
    },
    viewer: {
      can: ['posts:read', 'users:read'],
    },
  },
})
```

### 2. Wrap your app with the provider

```tsx
// App.tsx
import { PermissionProvider } from './permissions'

function App() {
  const userRoles = ['editor'] // from your auth system

  return (
    <PermissionProvider roles={userRoles}>
      <Dashboard />
    </PermissionProvider>
  )
}
```

### 3. Use the `<Can>` component or hook

```tsx
import { Can, usePermissions } from './permissions'

function Dashboard() {
  const { can, hasRole } = usePermissions()

  return (
    <div>
      {/* Declarative with <Can> component */}
      <Can do="posts:create">
        <button>Create Post</button>
      </Can>

      {/* With fallback */}
      <Can do="users:ban" fallback={<p>No access</p>}>
        <button>Ban User</button>
      </Can>

      {/* Multiple permissions (all required by default) */}
      <Can do={['posts:update', 'posts:delete']}>
        <button>Edit Post</button>
      </Can>

      {/* Any permission matches */}
      <Can do={['posts:update', 'posts:delete']} mode="any">
        <button>Manage Post</button>
      </Can>

      {/* Programmatic with hook */}
      {can('posts:read') && <PostList />}
      {hasRole('admin') && <AdminPanel />}
    </div>
  )
}
```

## API Reference

### `createPermissions(config)`

Factory function that creates type-safe permission utilities.

#### Config

| Property | Type | Description |
|----------|------|-------------|
| `roles` | `string[]` | List of role names |
| `resources` | `Record<string, string[]>` | Resources and their actions |
| `permissions` | `Record<role, { can, inherits? }>` | Permission mappings per role |

#### Returns

| Export | Description |
|--------|-------------|
| `PermissionProvider` | React context provider |
| `usePermissions` | Hook for accessing permission utilities |
| `Can` | Declarative component for conditional rendering |
| `allRoles` | Set of all defined roles |
| `allPermissions` | Set of all possible permissions |
| `getPermissionsForRole(role)` | Get all permissions for a role |
| `getRolesWithPermission(permission)` | Get all roles that have a permission |

### `<Can>` Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `do` | `Permission \| Permission[]` | required | Permission(s) to check |
| `mode` | `'all' \| 'any'` | `'all'` | Require all or any permission |
| `fallback` | `ReactNode` | `null` | Rendered when access denied |
| `children` | `ReactNode` | required | Rendered when access granted |

### `usePermissions()` Hook

Returns an object with:

| Method | Description |
|--------|-------------|
| `can(permission)` | Check single permission |
| `canAll(permissions)` | Check all permissions |
| `canAny(permissions)` | Check any permission |
| `hasRole(role)` | Check if user has role |
| `hasAllRoles(roles)` | Check all roles |
| `hasAnyRole(roles)` | Check any role |
| `roles` | Current user's roles |
| `permissions` | Set of resolved permissions |
| `getPermissionsForRole(role)` | Get permissions for a role |
| `getRolesWithPermission(permission)` | Get roles with a permission |

## Wildcards

```tsx
permissions: {
  admin: {
    can: ['*'], // All permissions
  },
  editor: {
    can: ['posts:*'], // All actions on posts resource
  },
}
```

## Role Inheritance

Roles can inherit from other roles:

```tsx
permissions: {
  admin: {
    can: ['users:*'],
    inherits: ['editor'], // Gets all editor permissions too
  },
  editor: {
    can: ['posts:*'],
    inherits: ['viewer'],
  },
  viewer: {
    can: ['posts:read'],
  },
}
```

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Run playground
pnpm play

# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Type check
pnpm typecheck

# Build
pnpm build
```

### Project Structure

```
├── src/
│   ├── index.ts              # Entry point
│   ├── create-permissions.tsx # Main implementation
│   └── create-permissions.test.tsx # Tests
├── playground/               # Development playground
│   └── src/
│       ├── App.tsx
│       └── config/permissions.ts
└── dist/                     # Built output
```
