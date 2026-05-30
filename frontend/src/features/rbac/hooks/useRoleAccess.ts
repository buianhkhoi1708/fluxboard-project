import { useMemo } from 'react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useRolesDictionary } from './useRbacQueries';

const normalizeRole = (value?: string | null) => {
  if (!value) return '';
  return String(value).toUpperCase().trim();
};

export const useRoleAccess = () => {
  const { user } = useAuthStore();
  const { data: roles = [], isLoading } = useRolesDictionary();

  const currentRoleName = useMemo(() => {
    if (!user) return 'GUEST';

    const anyUser = user as any;
    const directRoleName =
      anyUser.roleName ||
      anyUser.role_name ||
      anyUser.system_role ||
      anyUser.systemRole;

    if (directRoleName) return normalizeRole(directRoleName);

    const roleId = anyUser.role_id || anyUser.roleId;
    if (roleId && roles.length > 0) {
      const matchedRole = roles.find((role: any) => String(role.id) === String(roleId));
      if (matchedRole?.name) return normalizeRole(matchedRole.name);
    }

    return 'MEMBER';
  }, [user, roles]);

  const hasAccess = (allowedRoles: string[]) => {
    
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (isLoading) return false;

    const allowed = allowedRoles.map(normalizeRole).filter(Boolean);

    if (currentRoleName === 'SYSTEM_ADMIN') return true;

    return allowed.some((role) => currentRoleName === role || currentRoleName.includes(role));
  };

  return { currentRoleName, hasAccess, isLoadingRoles: isLoading };
};