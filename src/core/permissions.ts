
export type Role = 'owner' | 'head' | 'lead' | 'member';

const ROLE_HIERARCHY: Record<Role, number> = {
    owner: 3,
    head: 2,
    lead: 1,
    member: 0
};

export function getRolePriority(role: string): number {
    return ROLE_HIERARCHY[role as Role] ?? 0;
}

/**
 * Returns true if the actor has a higher role than the target.
 * Use strict=true to require strictly higher (actor > target).
 * Use strict=false to allow equal (actor >= target), but generally we want strict for management.
 */
export function canManageRole(actorRole: string, targetRole: string): boolean {
    // Owner can manage everyone (except maybe other owners depending on business logic, but usually yes)
    if (actorRole === 'owner') return true;

    // For everyone else, must be strictly higher
    return getRolePriority(actorRole) > getRolePriority(targetRole);
}

/**
 * Returns list of roles that the current user can invite or assign.
 */
export function getAssignableRoles(actorRole: string): Role[] {
    const priority = getRolePriority(actorRole);
    const roles: Role[] = ['member', 'lead', 'head', 'owner'];

    // Filter roles strictly below the actor's role
    return roles.filter(r => ROLE_HIERARCHY[r] < priority);
}
/**
 * Returns true if the actor can assign a team member to report to the potential manager.
 * Rule: You can only assign reports to YOURSELF or someone with LOWER role priority.
 * You cannot assign someone to report to your superior (Owner if you are Head).
 */
export function canAssignManager(actorRole: string, potentialManagerRole: string): boolean {
    // Owner can assign reports to anyone
    if (actorRole === 'owner') return true;

    // Others: Actor Priority >= Manager Priority
    return getRolePriority(actorRole) >= getRolePriority(potentialManagerRole);
}
