import type {
    Associate,
    BusinessUnit,
} from "@commercetools/platform-sdk";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMyBusinessUnits } from "@/lib/business-units";
import { getCustomerById } from "@/lib/customer";
import {
    getAssociateRoles,
    getEffectiveBusinessUnitAssociates,
} from "@/lib/associate-roles";

const PROJECT_KEY = process.env.CT_PROJECT_KEY;
const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

type CustomerRequestContext = {
    customerId: string;
    accessToken: string;
    storeKey?: string;
};

type RouteError = { error: string; status: number; code?: string };

function getApiUrl(storeKey?: string) {
    const apiUrl = process.env.CT_API_URL?.replace(/\/$/, "");
    if (!apiUrl || !PROJECT_KEY) {
        throw new Error("commercetools API is not configured");
    }

    const storePath = storeKey
        ? `in-store/key=${encodeURIComponent(storeKey)}/`
        : "";
    return `${apiUrl}/${storePath}${PROJECT_KEY}`;
}

async function getCustomerRequestContext(): Promise<
    CustomerRequestContext | RouteError
> {
    const cookieStore = await cookies();
    const customerId = await getSession();
    const accessToken = cookieStore.get("ct_customer_access_token")?.value;
    const storeKey = cookieStore.get("ct_customer_store_key")?.value;

    if (!customerId || !accessToken) {
        return { error: "Authentication required", status: 401 as const };
    }

    return { customerId, accessToken, storeKey };
}

async function getAuthorizedBusinessUnit(
    id: string,
): Promise<(CustomerRequestContext & { businessUnit: BusinessUnit }) | RouteError> {
    const context = await getCustomerRequestContext();
    if ("error" in context) {
        return context;
    }

    const unitResult = await getMyBusinessUnits();
    if (!unitResult.success) {
        return {
            error: unitResult.error,
            status: unitResult.statusCode ?? 502,
            ...(unitResult.code && { code: unitResult.code }),
        };
    }

    const businessUnit = unitResult.businessUnits.find((unit) => unit.id === id);
    if (!businessUnit) {
        return {
            error: "Business Unit is not accessible to this customer",
            status: 403,
        };
    }

    return {
        ...context,
        businessUnit,
    };
}

async function getAssociateResponse(businessUnit: BusinessUnit, customerId: string) {
    const associateReferences = [
        ...(businessUnit.associates ?? []),
        ...(businessUnit.associateMode === "ExplicitAndFromParent"
            ? businessUnit.inheritedAssociates ?? []
            : []),
    ].map(({ customer }) => customer);
    const customerIdsNeedingLookup = [...new Set(
        associateReferences
            .filter(({ obj }) =>
                obj?.firstName === undefined ||
                obj.lastName === undefined ||
                obj.email === undefined,
            )
            .map(({ id }) => id)
            .filter(Boolean),
    )];
    const [associateRoles, contactEntries] = await Promise.all([
        getAssociateRoles(),
        Promise.all(customerIdsNeedingLookup.map(async (id) => {
            const customer = await getCustomerById(id);
            return [id, customer] as const;
        })),
    ]);
    const contacts = new Map(contactEntries);

    const associates = getEffectiveBusinessUnitAssociates(
        businessUnit,
        associateRoles,
    ).map((associate) => {
        const contact = contacts.get(associate.customerId);

        return {
            ...associate,
            firstName: contact?.firstName ?? associate.firstName,
            lastName: contact?.lastName ?? associate.lastName,
            email: contact?.email ?? associate.email,
            isCurrentUser: associate.customerId === customerId,
        };
    });

    return {
        associates,
        roles: associateRoles.map(({ key, name, buyerAssignable }) => ({
            key,
            name,
            buyerAssignable,
        })),
        canManageAssociates: canManageBusinessUnitAssociates(
            businessUnit,
            customerId,
            associateRoles,
        ),
    };
}

function canManageBusinessUnitAssociates(
    businessUnit: BusinessUnit,
    customerId: string,
    associateRoles: Awaited<ReturnType<typeof getAssociateRoles>>,
) {
    const explicit = businessUnit.associates?.find(
        (associate) => associate.customer.id === customerId,
    );
    const inherited =
        businessUnit.associateMode === "ExplicitAndFromParent"
            ? businessUnit.inheritedAssociates?.find(
                  (associate) => associate.customer.id === customerId,
              )
            : undefined;
    const roleKeys = new Set([
        ...(explicit?.associateRoleAssignments ?? []).map(
            (assignment) => assignment.associateRole.key,
        ),
        ...(inherited?.associateRoleAssignments ?? []).map(
            (assignment) => assignment.associateRole.key,
        ),
    ]);

    return associateRoles.some(
        (role) => roleKeys.has(role.key) && role.permissions.includes("UpdateAssociates"),
    );
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const result = await getAuthorizedBusinessUnit(id);
        if ("error" in result) {
            return NextResponse.json(
                { message: result.error, ...(result.code && { code: result.code }) },
                { status: result.status },
            );
        }
        return NextResponse.json(
            await getAssociateResponse(result.businessUnit, result.customerId),
            { headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        console.error("Get Business Unit Associates failed:", error);
        return NextResponse.json(
            { message: "Failed to fetch Business Unit Associates" },
            { status: 500 },
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return updateExplicitAssociate(request, params);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return updateExplicitAssociate(request, params, true);
}

async function updateExplicitAssociate(
    request: Request,
    params: Promise<{ id: string }>,
    remove = false,
) {
    try {
        const { id } = await params;
        const result = await getAuthorizedBusinessUnit(id);
        if ("error" in result) {
            return NextResponse.json(
                { message: result.error, ...(result.code && { code: result.code }) },
                { status: result.status },
            );
        }
        let body: { customerId?: unknown; roleKeys?: unknown };
        try {
            body = (await request.json()) as {
                customerId?: unknown;
                roleKeys?: unknown;
            };
        } catch {
            return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
        }
        if (
            typeof body.customerId !== "string" ||
            (!remove &&
                (!Array.isArray(body.roleKeys) ||
                    body.roleKeys.length === 0 ||
                    !body.roleKeys.every((key) => typeof key === "string")))
        ) {
            return NextResponse.json({ message: "Invalid associate update" }, { status: 400 });
        }

        const associateRoles = await getAssociateRoles();
        if (
            !canManageBusinessUnitAssociates(
                result.businessUnit,
                result.customerId,
                associateRoles,
            )
        ) {
            return NextResponse.json({ message: "Permission denied" }, { status: 403 });
        }

        const explicitAssociate = result.businessUnit.associates?.find(
            (associate: Associate) => associate.customer.id === body.customerId,
        );
        if (!explicitAssociate) {
            return NextResponse.json(
                { message: "Only explicit associate assignments can be changed" },
                { status: 403 },
            );
        }

        const existingRoleKeys = new Set(
            explicitAssociate.associateRoleAssignments.map(
                (assignment) => assignment.associateRole.key,
            ),
        );
        const roleByKey = new Map(associateRoles.map((role) => [role.key, role]));
        const requestedRoleKeys = remove
            ? []
            : [...new Set(body.roleKeys as string[])];
        if (
            !remove &&
            !requestedRoleKeys.every((key) => {
                const role = roleByKey.get(key);
                return role && (role.buyerAssignable || existingRoleKeys.has(key));
            })
        ) {
            return NextResponse.json(
                { message: "Associate role is not assignable" },
                { status: 400 },
            );
        }

        const action = remove
            ? {
                  action: "removeAssociate",
                  customer: { id: body.customerId },
              }
            : {
                  action: "changeAssociate",
                  associate: {
                      customer: { id: body.customerId },
                      associateRoleAssignments: requestedRoleKeys.map((key) => ({
                          associateRole: { key },
                          inheritance:
                              explicitAssociate.associateRoleAssignments.find(
                                  (assignment) => assignment.associateRole.key === key,
                              )?.inheritance ?? "Disabled",
                      })),
                  },
              };

        const response = await fetch(
            `${getApiUrl(result.storeKey)}/me/business-units/${encodeURIComponent(id)}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${result.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    version: result.businessUnit.version,
                    actions: [action],
                }),
                cache: "no-store",
            },
        );

        if (!response.ok) {
            console.error("Business Unit associate update failed:", response.status);
            return NextResponse.json(
                { message: "Business Unit associate update was rejected" },
                { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update Business Unit Associate failed:", error);
        return NextResponse.json(
            { message: "Failed to update Business Unit Associate" },
            { status: 500 },
        );
    }
}
