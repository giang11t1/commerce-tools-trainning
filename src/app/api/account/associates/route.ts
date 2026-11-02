
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAssociateRoles } from "@/lib/associate-roles";
import { getCustomerById } from "@/lib/customer";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const customerId = cookieStore.get("ct_customer_id")?.value;
        const accessToken = cookieStore.get(
            "ct_customer_access_token"
        )?.value;
        const storeKey = cookieStore.get("ct_customer_store_key")?.value;

        if (!customerId || !accessToken) {
            return NextResponse.json(
                { message: "Please log in again." },
                { status: 401 }
            );
        }

        const projectKey = process.env.CT_PROJECT_KEY!;
        const apiUrl = process.env.CT_API_URL!.replace(/\/$/, "");

        const response = await fetch(
            `${apiUrl}/${projectKey}${storeKey ? `/in-store/key=${encodeURIComponent(storeKey)}` : ""}/me/business-units?limit=100`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            const error = await response.text();

            console.error("Business Units API error:", error);

            return NextResponse.json(
                { message: "Unable to retrieve your Business Units." },
                { status: response.status }
            );
        }

        const data = await response.json();
        const businessUnits = data.results ?? [];

        const businessUnit = businessUnits.find((unit: any) =>
            unit.associates?.some(
                (associate: any) => associate.customer?.id === customerId
            )
        );

        if (!businessUnit) {
            return NextResponse.json({
                businessUnit: null,
                associates: [],
            });
        }

        const [roles, associates] = await Promise.all([
            getAssociateRoles(),
            Promise.all(
                (businessUnit.associates ?? []).map(async (associate: any) => {
                    const id = associate.customer?.id;

                    if (!id) return null;

                    const customer = await getCustomerById(id);

                    if (!customer) return null;

                    const roleAssignments = (
                        associate.associateRoleAssignments ?? []
                    ).map((assignment: any) => {
                        const roleId = assignment.associateRole?.id;
                        const role = roles.find((item: any) => item.id === roleId);

                        return {
                            roleId,
                            roleName: role?.name ?? role?.key ?? "Unknown role",
                            inheritance: assignment.inheritance ?? null,
                            assignmentType: "Explicit",
                        };
                    });

                    return {
                        customerId: customer.id,
                        firstName: customer.firstName ?? "",
                        lastName: customer.lastName ?? "",
                        email: customer.email,
                        roles: roleAssignments,
                    };
                })
            ),
        ]);

        return NextResponse.json({
            businessUnit: {
                id: businessUnit.id,
                name: businessUnit.name,
            },
            associates: associates.filter(Boolean),
        });
    } catch (error) {
        console.error("Account associates error:", error);

        return NextResponse.json(
            { message: "Failed to retrieve associates." },
            { status: 500 }
        );
    }
}
