
import { NextResponse } from "next/server";
import { getAssociateRoles } from "@/lib/associate-roles";

export async function GET() {
    try {
        const roles = await getAssociateRoles();
        return NextResponse.json(roles);
    } catch (error) {
        console.error("Get Associate Roles error:", error);

        return NextResponse.json(
            {
                message: "Failed to fetch associate roles",
                error:
                    error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
