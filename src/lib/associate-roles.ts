
import type {
    Associate,
    AssociateRole,
    BusinessUnit,
    InheritedAssociate,
} from "@commercetools/platform-sdk";
import { client } from "@/lib/commercetools";

export async function getAssociateRoles(): Promise<AssociateRole[]> {
    const projectKey = process.env.CT_PROJECT_KEY;

    if (!projectKey) {
        throw new Error("CT_PROJECT_KEY is not configured");
    }

    const response = await client.execute({
        uri: `/${projectKey}/associate-roles`,
        method: "GET",
    });

    return response.body.results;
}


export async function getAssociateRoleById(id: string) {
    const projectKey = process.env.CT_PROJECT_KEY!;

    const response = await client.execute({
        uri: `/${projectKey}/associate-roles/${encodeURIComponent(id)}`,
        method: "GET",
    });

    return response.body;
}


export interface EffectiveBusinessUnitAssociate {
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    assignmentType: "Explicit" | "Inherited" | "Both";
    roles: {
        roleKey: string;
        roleName: string;
        assignmentType: "Explicit" | "Inherited";
        sourceKey?: string;
    }[];
}

export function getEffectiveBusinessUnitAssociates(
    businessUnit: BusinessUnit,
    associateRoles: AssociateRole[],
): EffectiveBusinessUnitAssociate[] {
    const rolesByKey = new Map(associateRoles.map((role) => [role.key, role]));
    const associatesById = new Map<
        string,
        EffectiveBusinessUnitAssociate & {
            assignmentTypes: Set<"Explicit" | "Inherited">;
            roleKeys: Set<string>;
        }
    >();

    function addAssociate(
        associate: Associate | InheritedAssociate,
        assignmentType: "Explicit" | "Inherited",
    ) {
        const customer = associate.customer;
        const customerId = customer?.id;

        if (!customerId) {
            return;
        }

        const existing = associatesById.get(customerId) ?? {
            customerId,
            firstName: customer.obj?.firstName ?? "",
            lastName: customer.obj?.lastName ?? "",
            email: customer.obj?.email ?? "",
            assignmentType,
            roles: [],
            assignmentTypes: new Set<"Explicit" | "Inherited">(),
            roleKeys: new Set<string>(),
        };
        existing.assignmentTypes.add(assignmentType);

        for (const assignment of associate.associateRoleAssignments ?? []) {
            const roleKey = assignment.associateRole.key;
            const sourceKey =
                assignmentType === "Inherited" && "source" in assignment
                    ? assignment.source.key
                    : undefined;
            const assignmentKey = `${assignmentType}:${roleKey}:${sourceKey ?? ""}`;

            if (existing.roleKeys.has(assignmentKey)) {
                continue;
            }

            existing.roles.push({
                roleKey,
                roleName: rolesByKey.get(roleKey)?.name ?? roleKey,
                assignmentType,
                ...(sourceKey && { sourceKey }),
            });
            existing.roleKeys.add(assignmentKey);
        }

        existing.assignmentType =
            existing.assignmentTypes.size > 1
                ? "Both"
                : existing.assignmentTypes.has("Inherited")
                  ? "Inherited"
                  : "Explicit";
        associatesById.set(customerId, existing);
    }

    (businessUnit.associates ?? []).forEach((associate) =>
        addAssociate(associate, "Explicit"),
    );

    if (businessUnit.associateMode === "ExplicitAndFromParent") {
        (businessUnit.inheritedAssociates ?? []).forEach((associate) =>
            addAssociate(associate, "Inherited"),
        );
    }

    return Array.from(associatesById.values(), (associate) => ({
        customerId: associate.customerId,
        firstName: associate.firstName,
        lastName: associate.lastName,
        email: associate.email,
        assignmentType: associate.assignmentType,
        roles: associate.roles,
    }));
}
