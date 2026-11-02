
import { client } from "@/lib/commercetools";

export async function getAssociateRoles() {
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


export async function getBusinessUnitAssociates(
    businessUnitId: string
) {
    const projectKey = process.env.CT_PROJECT_KEY;

    if (!projectKey) {
        throw new Error("CT_PROJECT_KEY is not configured");
    }

    const response = await client.execute({
        uri: `/${projectKey}/business-units/${encodeURIComponent(
            businessUnitId
        )}`,
        method: "GET",
    });

    const businessUnit = response.body;

    return {
        businessUnitId: businessUnit.id,
        businessUnitKey: businessUnit.key,
        name: businessUnit.name,
        associates: (businessUnit.associates ?? []).map(
            (associate: any) => ({
                customerId: associate.customer.id,
                associateRoleAssignments:
                    associate.associateRoleAssignments ?? [],
            })
        ),
    };
}
